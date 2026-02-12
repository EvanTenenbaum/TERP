/**
 * Test Database Utility
 * 
 * Provides a properly mocked database for testing that matches the real db interface.
 * This utility solves the "db is not defined" errors in tests.
 */

import { vi } from 'vitest';

// Helper to get table name from object
function getTableName(table: unknown): string {
    if (typeof table === 'string') return table;
    if (!table) return 'unknown';
    const symbols = Object.getOwnPropertySymbols(table);
    for (const sym of symbols) {
        if (sym.toString() === 'Symbol(drizzle:Name)') {
            return (table as Record<symbol, string>)[sym];
        }
    }
    const t = table as Record<string, unknown>;
    if (t._ && typeof t._ === 'object' && t._ !== null) {
        const underscore = t._ as Record<string, unknown>;
        if (underscore.name) return String(underscore.name);
    }
    return 'unknown';
}

function getColValue(rowCtx: Record<string, unknown>, col: { table?: unknown; name: string }): unknown {
    const tableName = getTableName(col.table);
    const row = rowCtx[tableName] as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return row[col.name];
}

export function createMockDb() {
  const storage: Record<string, any[]> = {};

  const getStorage = (key: string) => {
      if (storage[key]) return storage[key];
      const snake = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (storage[snake]) return storage[snake];
      return [];
  };

  const mockDb: Record<string, unknown> & { transaction: typeof vi.fn; query: Record<string, unknown> } = {
    select: vi.fn((selection) => {
        let currentRows: Array<Record<string, unknown>> = [];
        let isJoined = false;

        const builder: Record<string, unknown> = {
            from: vi.fn((table) => {
                const tableName = getTableName(table);
                // Start with wrapped rows: { [tableName]: row }
                currentRows = (storage[tableName] || []).map(row => ({ [tableName]: row }));
                return builder;
            }),
            leftJoin: vi.fn((table: unknown, condition: unknown) => {
                isJoined = true;
                const joinTableName = getTableName(table);
                const joinRows = storage[joinTableName] || [];

                const newRows: any[] = [];
                currentRows.forEach(mainRow => {
                    let matchFound = false;

                    joinRows.forEach(joinRow => {
                         const matches = true;

                         const checkCond = (cond: { op: string; col: { table?: unknown; name: string }; val?: unknown; args?: Array<{ op: string; col: { table?: unknown; name: string }; val?: unknown }> | undefined }): boolean => {
                             if (!cond) return true;
                             if (cond.op === 'eq') {
                                 const leftVal = getColValue(mainRow, cond.col as { table?: unknown; name: string });

                                 let rightVal: unknown = cond.val;
                                 if (cond.val && typeof cond.val === 'object' && 'table' in cond.val && (cond.val as { table?: unknown }).table) {
                                     const valObj = cond.val as { table?: unknown; name: string };
                                     if (getTableName(valObj.table) === joinTableName) {
                                         rightVal = (joinRow as Record<string, unknown>)[valObj.name];
                                     } else {
                                         rightVal = getColValue(mainRow, valObj);
                                     }
                                 }

                                 return leftVal == rightVal;
                             }
                             if (cond.op === 'and') {
                                 return cond.args?.every(checkCond) ?? true;
                             }
                             return true;
                         };

                         if (checkCond(condition as { op: string; col: { table?: unknown; name: string }; val?: unknown; args?: Array<{ op: string; col: { table?: unknown; name: string }; val?: unknown }> | undefined })) {
                             newRows.push({ ...mainRow, [joinTableName]: joinRow });
                             matchFound = true;
                         }
                    });

                    if (!matchFound) {
                        newRows.push({ ...mainRow, [joinTableName]: null });
                    }
                });

                currentRows = newRows;
                return builder;
            }),
            where: vi.fn((condition) => {
                const applyCondition = (cond: any) => {
                    if (!cond) return;
                    if (cond.op === 'eq') {
                         currentRows = currentRows.filter(rowCtx => {
                             const val = getColValue(rowCtx, cond.col);
                             return val == cond.val;
                         });
                    } else if (cond.op === 'and') {
                        cond.args.forEach(applyCondition);
                    } else if (cond.op === 'inArray') {
                         currentRows = currentRows.filter(rowCtx => {
                             const val = getColValue(rowCtx, cond.col);
                             return cond.values.includes(val);
                         });
                    }
                };
                applyCondition(condition);
                return builder;
            }),
            limit: vi.fn((n) => {
                currentRows = currentRows.slice(0, n);
                return builder;
            }),
            offset: vi.fn(() => builder),
            orderBy: vi.fn(() => builder),
            groupBy: vi.fn(() => builder),
            innerJoin: vi.fn(() => builder),
            then: (resolve: any) => {
                if (isJoined) {
                    if (selection && typeof selection === 'object') {
                         const mappedRows = currentRows.map(row => {
                             const mapped: any = {};
                             for (const key in selection) {
                                 const targetTable = getTableName(selection[key]);
                                 mapped[key] = row[targetTable];
                             }
                             return mapped;
                         });
                         return resolve(mappedRows);
                    }
                    return resolve(currentRows);
                } else {
                    const flatRows = currentRows.map(r => Object.values(r)[0]);
                    return resolve(flatRows);
                }
            },
            execute: vi.fn().mockResolvedValue(currentRows)
        };
        return builder;
    }),

    selectDistinct: vi.fn((selection) => {
        let currentRows: any[] = [];

        const builder: any = {
            from: vi.fn((table: unknown) => {
                const tableName = getTableName(table);
                currentRows = (storage[tableName] || []).map(row => ({ [tableName]: row }));
                return builder;
            }),
            where: vi.fn(() => builder),
            orderBy: vi.fn(() => builder),
            groupBy: vi.fn(() => builder),
            then: (resolve: any) => {
                const flatRows = currentRows.map(r => Object.values(r)[0]);
                // Simple dedup based on JSON string
                const seen = new Set();
                const unique = flatRows.filter(row => {
                    const key = JSON.stringify(row);
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                return resolve(unique);
            },
        };
        return builder;
    }),
    
    insert: vi.fn((table) => {
        const tableName = getTableName(table);
        return {
            values: vi.fn((values) => {
                const rows = Array.isArray(values) ? values : [values];

                const mappedRows = rows.map((row: any) => {
                    const mapped: any = { ...row };
                    for (const key of Object.keys(row)) {
                         const col = table[key];
                         if (col && typeof col === 'object' && col.name) {
                             mapped[col.name] = row[key];
                         }
                    }
                    return mapped;
                });

                if (!storage[tableName]) storage[tableName] = [];
                const startId = storage[tableName].length + 1;

                const newRows = mappedRows.map((r: any, i: number) => ({
                    ...r,
                    id: r.id || (startId + i)
                }));

                storage[tableName].push(...newRows);

                const result = { insertId: newRows[0].id, changes: newRows.length };
                const returningIds = newRows.map(r => ({ id: r.id }));
                return {
                    onDuplicateKeyUpdate: vi.fn().mockResolvedValue(result),
                    $returningId: vi.fn(() => Promise.resolve(returningIds)),
                    then: (resolve: any) => resolve(result)
                };
            })
        };
    }),
    
    update: vi.fn((table) => {
        const tableName = getTableName(table);
        return {
            set: vi.fn((values) => {
                return {
                    where: vi.fn((condition) => {
                        const rows = storage[tableName] || [];
                        let updatedCount = 0;
                        
                        const newRows = rows.map(row => {
                            let match = false;
                            const checkCondition = (cond: any): boolean => {
                                if (!cond) return true;
                                if (cond.op === 'eq') {
                                    return row[cond.col.name] == cond.val;
                                } else if (cond.op === 'and') {
                                    return cond.args.every(checkCondition);
                                }
                                return true;
                            };
                            
                            if (checkCondition(condition)) {
                                match = true;
                            }
                            
                            if (match) {
                                updatedCount++;
                                const updatedRow = { ...row };
                                for (const key in values) {
                                    updatedRow[key] = values[key];
                                    const col = table[key];
                                    if (col && typeof col === 'object' && col.name) {
                                        updatedRow[col.name] = values[key];
                                    }
                                }
                                return updatedRow;
                            }
                            return row;
                        });
                        
                        storage[tableName] = newRows;
                        
                        return { then: (r: any) => r({ changes: updatedCount }) };
                    })
                };
            })
        };
    }),
    
    delete: vi.fn((table) => {
        const tableName = getTableName(table);
        return {
            where: vi.fn((condition) => {
                if (condition && condition.op === 'eq') {
                     const colName = condition.col.name;
                     const initialLen = (storage[tableName] || []).length;
                     storage[tableName] = (storage[tableName] || []).filter((r: any) => r[colName] != condition.val);
                     return { then: (r: any) => r({ changes: initialLen - storage[tableName].length }) };
                }
                return { then: (r: any) => r({ changes: 0 }) };
            })
        };
    }),
    
    query: new Proxy({}, {
        get: (target, prop: string) => {
            return {
                findFirst: vi.fn((args) => {
                    const rows = getStorage(prop);
                    let result = rows;
                    if (args?.where) {
                        const applyCondition = (cond: any) => {
                            if (!cond) return;
                            if (cond.op === 'eq') {
                                const colName = cond.col.name;
                                const initialLen = result.length;
                                result = result.filter((r: any) => {
                                    const val = r[colName];
                                    const match = val == cond.val;
                                    process.stdout.write(`[findFirst] Filter ${prop}: ${colName}=${val} vs ${cond.val} -> ${match}\n`);
                                    return match;
                                });
                            } else if (cond.op === 'and') {
                                cond.args.forEach(applyCondition);
                            } else {
                                process.stdout.write(`[findFirst] Unknown Op: ${cond.op}\n`);
                            }
                        };
                        applyCondition(args.where);
                    } else {
                        process.stdout.write(`[findFirst] No where args\n`);
                    }
                    return Promise.resolve(result[0] || undefined);
                }),
                findMany: vi.fn((args) => {
                    let result = getStorage(prop);
                    if (args?.where) {
                        const applyCondition = (cond: any) => {
                            if (!cond) return;
                            if (cond.op === 'eq') {
                                const colName = cond.col.name;
                                result = result.filter((r: any) => r[colName] == cond.val);
                            } else if (cond.op === 'and') {
                                cond.args.forEach(applyCondition);
                            }
                        };
                        applyCondition(args.where);
                    }
                    if (args?.limit) result = result.slice(0, args.limit);
                    return Promise.resolve(result);
                }),
            };
        }
    }),
    
    transaction: vi.fn((callback) => callback(mockDb)),
  };
  
  return mockDb;
}

export function setupDbMock() {
  const mockDb = createMockDb();
  return {
    db: mockDb,
    getDb: vi.fn().mockResolvedValue(mockDb),
  };
}

export function mockSelectQuery(mockDb: any, results: any[]) {
    // Basic mock
}
