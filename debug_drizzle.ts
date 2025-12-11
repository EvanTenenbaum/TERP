
import { users } from './drizzle/schema.ts';

console.log('Keys:', Object.keys(users));
// @ts-ignore
console.log('Name from _:', users._?.name);
// @ts-ignore
console.log('Name direct:', users.name);
