// Usage: npm run hash-password -- "your-password"
// Prints a bcrypt hash to put in ADMIN_PASSWORD_HASH.
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run hash-password -- "your-password"');
  process.exit(1);
}
console.log(await bcrypt.hash(password, 12));
