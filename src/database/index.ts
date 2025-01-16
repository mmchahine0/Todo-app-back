import prisma from "./prismaClient";

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Error connecting to the database", error);
    process.exit(1);
  }
};

export default connectDB;
