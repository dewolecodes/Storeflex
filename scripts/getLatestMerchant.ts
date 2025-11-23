#!/usr/bin/env node
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
    const user = await (prisma as any).user.findFirst({ where: { role: 'MERCHANT' }, orderBy: { createdAt: 'desc' }, select: { id: true, email: true, tenantId: true, createdAt: true } });
    if (!user) {
        console.log('No merchant users found.');
    } else {
        console.log('Latest merchant user:');
        console.log({ id: user.id, email: user.email, tenantId: user.tenantId ? String(user.tenantId).slice(0, 8) + '...' : null, createdAt: user.createdAt });
    }
    await prisma.$disconnect();
}

main().catch(async (e) => { console.error('Failed:', e?.message || e); await prisma.$disconnect(); process.exit(1); });
