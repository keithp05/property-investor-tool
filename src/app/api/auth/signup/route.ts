import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const signup = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(8).max(72),
  role: z.enum(['LANDLORD', 'TENANT']),
});
export async function POST(request: NextRequest) {
  try {
    const parsed = signup.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Enter a valid name, email, password (8–72 characters) and account role' }, { status: 400 });
    const { name, email, password, role } = parsed.data;
    const user = await prisma.user.create({
      data: {
        name, email, role, password: await bcrypt.hash(password, 12),
        subscriptionTier: 'FREE', subscriptionStatus: 'INACTIVE',
        ...(role === 'LANDLORD' ? { landlordProfile: { create: {} } } : { tenantProfile: { create: {} } }),
      },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
