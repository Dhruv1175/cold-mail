import {PrismaClient} from "@prisma/client";
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)


const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ["query"],
    adapter
  });
};

declare global {
    var prisma : 'undefined' | ReturnType<typeof prismaClientSingleton>
}

const globalForPrisma = global as unknown as {prisma:PrismaClient};

export const prisma = globalForPrisma.prisma || prismaClientSingleton();

if(process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;