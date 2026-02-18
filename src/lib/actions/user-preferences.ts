'use server';

import { cookies } from 'next/headers';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';

export async function updateFontSizePreference(
  size: 'SMALL' | 'MEDIUM' | 'LARGE'
): Promise<{ error?: string }> {
  const session = await verifySession();
  try {
    await prisma.user.update({
      where: { id: session.id },
      data: { fontSizePreference: size },
    });
    const cookieStore = await cookies();
    cookieStore.set('mvo_font_size', size.toLowerCase(), {
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    });
    return {};
  } catch {
    return { error: 'Failed to update font size preference' };
  }
}
