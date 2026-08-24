import SupaAuthVerifyEmail from "@/emails";
import supabaseAdmin from "@/lib/supabase/admin";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data?.email || !data?.password) {
      return Response.json(
        { error: { message: "Email and password are required." } },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();

    // If Resend API key and domain are provided, use OTP email verification
    if (process.env.RESEND_API_KEY && process.env.RESEND_DOMAIN) {
      const res = await supabase.auth.admin.generateLink({
        type: "signup",
        email: data.email,
        password: data.password,
      });

      if (res.data.properties?.email_otp) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const resendRes = await resend.emails.send({
          from: `MCPPro <onboarding@${process.env.RESEND_DOMAIN}>`,
          to: [data.email],
          subject: "MCPPro - Verify Email",
          react: SupaAuthVerifyEmail({
            verificationCode: res.data.properties?.email_otp,
          }),
        });
        return Response.json(resendRes);
      }
    }

    // Direct registration with automatic email confirmation
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (createError) {
      return Response.json({ error: createError }, { status: 400 });
    }

    return Response.json({ data: userData, directLogin: true });
  } catch (error: any) {
    console.error("[api/auth/signup] error:", error);
    return Response.json(
      { error: { message: error?.message || "Registration failed. Please try again." } },
      { status: 500 }
    );
  }
}
