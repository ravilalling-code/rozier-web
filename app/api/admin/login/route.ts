import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const VALID_USERNAME = 'admin';
const VALID_PASSWORD = '@Sallco21.';
export const COOKIE_NAME = 'petalia_admin_session';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (
      username?.trim() === VALID_USERNAME &&
      password === VALID_PASSWORD
    ) {
      const cookieStore = await cookies();
      cookieStore.set(COOKIE_NAME, 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 días
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Usuario o contraseña incorrectos.' },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Error procesando inicio de sesión.' },
      { status: 500 }
    );
  }
}
