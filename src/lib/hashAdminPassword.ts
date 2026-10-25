import { hashPassword } from "./adminPassword";

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run admin:hash -- "<your password>"');
  process.exit(1);
}

console.log(hashPassword(password));
