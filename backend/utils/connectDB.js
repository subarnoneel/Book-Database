import dns from "dns";
import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set. Copy .env.example to .env and fill it in.");
  }

  // Optional: some local setups (VPNs such as Cloudflare WARP) leave Node with a DNS
  // server that refuses the SRV lookup "mongodb+srv://" needs. DNS_SERVERS lets this
  // machine use specific DNS servers instead, e.g. "1.1.1.1,8.8.8.8".
  const dnsServers = (process.env.DNS_SERVERS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (dnsServers.length) dns.setServers(dnsServers);

  const conn = await mongoose.connect(uri);
  console.log(`MongoDB connected: ${conn.connection.host}`);
};

export default connectDB;
