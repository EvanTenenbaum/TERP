import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Hoist mock storage
const { mockStorage } = vi.hoisted(() => ({
  mockStorage: {} as Record<string, unknown[]>
}));

// Mock DB
vi.mock("../db", () => {
    function getTableName(table: any) {
        const symbols = Object.getOwnPropertySymbols(table);
        for (const sym of symbols) {
            if (sym.toString() === 'Symbol(drizzle:Name)') {
                return table[sym];
            }
        }
        if (table._?.name) return table._.name;
        return 'unknown';
    }

    const mockDb = {
        select: vi.fn((selection) => {
            let currentTable = '';
            let currentRows: any[] = [];
            let mainTable: any = null;
            
            const queryBuilder = {
                from: vi.fn((table) => {
                    mainTable = table;
                    currentTable = getTableName(table);
                    const storageKey = currentTable; 
                    if (!mockStorage[storageKey]) mockStorage[storageKey] = [];
                    currentRows = [...mockStorage[storageKey]];
                    return queryBuilder;
                }),
                where: vi.fn((condition) => {
                     // Check if condition is AND
                     if (condition && condition.op === 'and') {
                         for (const subCond of condition.args) {
                             if (subCond.op === 'eq') {
                                 const colName = subCond.col.name;
                                 currentRows = currentRows.filter(r => r[colName] === subCond.val);
                             }
                         }
                     } else if (condition && condition.op === 'eq') {
                         const colName = condition.col.name;
                         currentRows = currentRows.filter(r => r[colName] === condition.val);
                     }
                     return queryBuilder;
                }),
                limit: vi.fn((n) => {
                    currentRows = currentRows.slice(0, n);
                    return queryBuilder;
                }),
                innerJoin: vi.fn((table, condition) => {
                    const joinTableName = getTableName(table);
                    const joinRows = mockStorage[joinTableName] || [];
                    
                    if (condition && condition.op === 'eq') {
                         const mainColName = condition.col.name;
                         const joinColName = condition.val.name;
                         
                         const joined = [];
                         for (const mainRow of currentRows) {
                             const matchingJoinRow = joinRows.find(jr => jr[joinColName] === mainRow[mainColName]);
                             if (matchingJoinRow) {
                                 // Just merge rows to keep data for filtering
                                 joined.push({ ...mainRow, ...matchingJoinRow });
                             }
                         }
                         currentRows = joined;
                    }
                    return queryBuilder;
                }),
                then: (resolve: any) => {
                    if (!mainTable) {
                        return resolve(currentRows);
                    }
                    
                    const jsRows = currentRows.map(row => {
                        const mapped: any = {};
                        
                        // Map main table columns: DB name -> JS name
                        for (const prop in mainTable) {
                             const col = mainTable[prop];
                             if (col && typeof col === 'object' && col.name) {
                                 const dbName = col.name;
                                 if (row[dbName] !== undefined) {
                                     mapped[prop] = row[dbName];
                                 }
                             }
                        }
                        
                        // Copy non-column keys and also keys from joined tables
                        // Since we don't have the join table schema here easily, 
                        // we just copy everything that hasn't been mapped.
                        for (const key in row) {
                            let isMainCol = false;
                            for (const prop in mainTable) {
                                if (mainTable[prop]?.name === key) {
                                    isMainCol = true;
                                    break;
                                }
                            }
                            if (!isMainCol) {
                                mapped[key] = row[key];
                            }
                        }
                        return mapped;
                    });
                    
                    // Apply Selection Projection
                    if (selection) {
                         const projectedRows = jsRows.map(row => {
                            const projected: any = {};
                            for (const key in selection) {
                                // key is the alias (e.g. permissionName)
                                // value is column object
                                const col = selection[key];
                                if (col && col.name) {
                                    // col.name is 'name'
                                    // We check if we have 'name' in the row.
                                    // But wait, jsRows has 'name' mapped to 'name' property?
                                    // For permissions table, name -> name.
                                    
                                    // We need to look up the value.
                                    // If row has the property matching column name, use it.
                                    // row[col.name] might work if col.name was preserved as key.
                                    // In jsRows loop, 'name' from permissions was copied as 'name' (since it wasn't in mainTable rolePermissions).
                                    
                                    if (row[col.name] !== undefined) {
                                        projected[key] = row[col.name];
                                    } else {
                                        // Fallback: maybe it was mapped to a property?
                                        // But we don't know the property name for joined tables here.
                                        // However, in this test, permissions.name -> name column -> 'name' key in row.
                                        projected[key] = row[col.name];
                                    }
                                }
                            }
                            return projected;
                        });
                        return resolve(projectedRows);
                    }
                    
                    resolve(jsRows);
                }
            };
            return queryBuilder;
        }),
        insert: vi.fn((table) => {
            const tableName = getTableName(table);
            return {
                values: vi.fn((values) => {
                    const rows = Array.isArray(values) ? values : [values];
                    
                    // Map keys to DB column names
                    const mappedRows = rows.map(row => {
                        const mapped: any = {};
                        for (const key of Object.keys(row)) {
                             const col = table[key];
                             // Check if it's a column object with a name property
                             if (col && typeof col === 'object' && col.name) {
                                 mapped[col.name] = row[key];
                             } else {
                                 mapped[key] = row[key];
                             }
                        }
                        return mapped;
                    });
            
                    if (!mockStorage[tableName]) mockStorage[tableName] = [];
                    const startId = mockStorage[tableName].length + 1;
                    
                    const newRows = mappedRows.map((r, i) => ({
                        ...r,
                        id: r.id || (startId + i)
                    }));
                    
                    mockStorage[tableName].push(...newRows);
                    
                    return {
                        onDuplicateKeyUpdate: vi.fn(() => Promise.resolve())
                    };
                })
            };
        }),
        delete: vi.fn((table) => {
            const tableName = getTableName(table);
            mockStorage[tableName] = [];
            return Promise.resolve();
        })
    };

    return { getDb: vi.fn().mockResolvedValue(mockDb) };
});

// Mock Drizzle ORM operators
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual("drizzle-orm");
  return {
    ...actual,
    eq: (col: any, val: any) => ({ op: 'eq', col, val }),
    and: (...args: any[]) => ({ op: 'and', args })
  };
});

import { roles, permissions, rolePermissions, userRoles } from "../../drizzle/schema";
import { seedRBACDefaults, assignRoleToUser } from "./seedRBAC";
import { getDb } from "../db";
import { eq, and } from "drizzle-orm";

describe("RBAC Seeding", () => {
    let db: any;

    beforeEach(async () => {
        // Clear all keys in mockStorage
        for (const key in mockStorage) {
            mockStorage[key] = [];
        }
        vi.clearAllMocks();
        db = await getDb();
    });

    afterEach(async () => {
        // cleanup
    });

    describe("seedRBACDefaults", () => {
        it("should seed 10 roles", async () => {
            await seedRBACDefaults();

            const allRoles = await db.select().from(roles);
            expect(allRoles).toHaveLength(10);
            
            const roleNames = allRoles.map((r: any) => r.name);
            expect(roleNames).toContain("Super Admin");
        });

        it("should seed 255 permissions", async () => {
            await seedRBACDefaults();
            const allPermissions = await db.select().from(permissions);
            expect(allPermissions.length).toBeGreaterThanOrEqual(250);
        });

        it("should create role-permission mappings", async () => {
            await seedRBACDefaults();
            const mappings = await db.select().from(rolePermissions);
            expect(mappings.length).toBeGreaterThan(0);
        });

        it("should assign ALL permissions to Super Admin", async () => {
            await seedRBACDefaults();

            const [superAdminRole] = await db
                .select()
                .from(roles)
                .where(eq(roles.name, "Super Admin"))
                .limit(1);

            expect(superAdminRole).toBeDefined();

            const superAdminPermissions = await db
                .select()
                .from(rolePermissions)
                .where(eq(rolePermissions.roleId, superAdminRole.id));

            const allPermissions = await db.select().from(permissions);
            expect(superAdminPermissions.length).toBe(allPermissions.length);
        });

        it("should be idempotent", async () => {
            await seedRBACDefaults();
            const firstRoles = await db.select().from(roles);
            
            await seedRBACDefaults();
            const secondRoles = await db.select().from(roles);

            expect(secondRoles).toHaveLength(firstRoles.length);
        });
        
        it("should mark all roles as system roles", async () => {
            await seedRBACDefaults();
            const allRoles = await db.select().from(roles);
            allRoles.forEach((role: any) => {
                expect(role.isSystemRole).toBe(1);
            });
        });

        it("should create permissions across multiple modules", async () => {
            await seedRBACDefaults();
            const allPermissions = await db.select().from(permissions);
            const modules = new Set(allPermissions.map((p: any) => p.module));
            expect(modules.size).toBeGreaterThan(10);
        });
    });

    describe("assignRoleToUser", () => {
        beforeEach(async () => {
            await seedRBACDefaults();
        });

        it("should assign a role to a user", async () => {
            const testUserId = "test-user-123";
            await assignRoleToUser(testUserId, "Super Admin");

            const assignment = await db
                .select()
                .from(userRoles)
                .where(eq(userRoles.userId, testUserId))
                .limit(1);

            expect(assignment).toHaveLength(1);
        });

        it("should be idempotent (not create duplicate assignments)", async () => {
            const testUserId = "test-user-456";
            await assignRoleToUser(testUserId, "Operations Manager");
            await assignRoleToUser(testUserId, "Operations Manager");

            const assignments = await db
                .select()
                .from(userRoles)
                .where(eq(userRoles.userId, testUserId));

            expect(assignments).toHaveLength(1);
        });
        
         it("should handle non-existent role gracefully", async () => {
            const testUserId = "test-user-789";
            await expect(assignRoleToUser(testUserId, "Non-Existent Role")).resolves.not.toThrow();
            
            const assignments = await db
                .select()
                .from(userRoles)
                .where(eq(userRoles.userId, testUserId));
            expect(assignments).toHaveLength(0);
        });

        it("should allow assigning multiple roles to same user", async () => {
            const testUserId = "test-user-multi";
            await assignRoleToUser(testUserId, "Sales Manager");
            await assignRoleToUser(testUserId, "Customer Service");

            const assignments = await db
                .select()
                .from(userRoles)
                .where(eq(userRoles.userId, testUserId));

            expect(assignments).toHaveLength(2);
        });
    });

    describe("Role Permission Verification", () => {
        beforeEach(async () => {
            await seedRBACDefaults();
        });

        it("Operations Manager should have inventory and orders permissions", async () => {
            const [opsManagerRole] = await db
                .select()
                .from(roles)
                .where(eq(roles.name, "Operations Manager"))
                .limit(1);

            const opsPermissions = await db
                .select({
                    permissionName: permissions.name,
                })
                .from(rolePermissions)
                .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
                .where(eq(rolePermissions.roleId, opsManagerRole.id));

            const permissionNames = opsPermissions.map((p: any) => p.permissionName);

            expect(permissionNames).toContain("inventory:read");
            expect(permissionNames).toContain("orders:read");
        });
    });
});
