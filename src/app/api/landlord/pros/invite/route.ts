import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/landlord/pros/invite
 * Invite a pro to join landlord's network
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, phone, name } = await request.json();

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Email or phone required' },
        { status: 400 }
      );
    }

    // Get landlord profile
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlordProfile) {
      return NextResponse.json({ error: 'Landlord profile not found' }, { status: 404 });
    }

    // Check if pro already exists by email
    let proProfile = null;
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        include: { proProfile: true },
      });
      if (existingUser?.proProfile) {
        proProfile = existingUser.proProfile;
      }
    }

    if (proProfile) {
      // Pro exists - check if already connected
      const existingConnection = await prisma.landlordPro.findUnique({
        where: {
          landlordId_proId: {
            landlordId: landlordProfile.id,
            proId: proProfile.id,
          },
        },
      });

      if (existingConnection) {
        return NextResponse.json(
          { error: 'This pro is already in your network' },
          { status: 400 }
        );
      }

      // Create connection
      const connection = await prisma.landlordPro.create({
        data: {
          landlordId: landlordProfile.id,
          proId: proProfile.id,
          status: 'PENDING',
          invitedBy: 'LANDLORD',
          inviteEmail: email,
          invitePhone: phone,
        },
      });

      // TODO: Send notification to pro about invitation

      return NextResponse.json({
        success: true,
        connection,
        message: 'Invitation sent to existing pro',
      });
    } else {
      // Pro doesn't exist - create invitation record
      // In a real app, we'd send an email/SMS with signup link

      // For now, create a placeholder - in production you'd:
      // 1. Generate a unique invite token
      // 2. Send email/SMS with link to /pro/register?invite=TOKEN
      // 3. When pro signs up with token, auto-connect them

      // TODO: Implement invitation email/SMS
      console.log(`📧 Would send invitation to: ${email || phone}`);

      return NextResponse.json({
        success: true,
        message: `Invitation will be sent to ${email || phone}`,
        note: 'Email/SMS sending not yet implemented',
      });
    }

  } catch (error: any) {
    console.error('Invite pro error:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation', details: error.message },
      { status: 500 }
    );
  }
}
