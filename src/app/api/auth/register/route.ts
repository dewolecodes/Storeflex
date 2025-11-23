import bcrypt from "bcrypt";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/shared/lib/db";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { storeName, email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Basic validation
        if (password.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await db.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: "Email already registered" }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create tenant then user linked to tenant
        const slug = storeName?.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "") ?? '';

        // Create tenant (avoid duplicate slug/email)
        const tenant = await db.tenant.create({
            data: {
                name: storeName,
                slug,
                email,
            },
        });

        const user = await db.user.create({
            data: {
                email,
                name: storeName ?? undefined,
                hashedPassword,
                role: "MERCHANT",
                tenant: { connect: { id: tenant.id } },
            },
        });

        return NextResponse.json({ message: "Registration successful", tenantId: tenant.id, userId: user.id }, { status: 201 });
    } catch (error: unknown) {
        console.error("Registration error:", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message || "Registration failed" }, { status: 500 });
    }
}
