import { Resend } from "resend";
import { env } from "@/env";
import { EMAIL_FROM } from "@/lib/constants/email";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export async function sendVerificationOTPEmail(
  email: string,
  otp: string,
  type: string
): Promise<void> {
  const subjectMap: Record<string, string> = {
    "sign-in": "Your sign-in code",
    "email-verification": "Verify your email address",
    "forget-password": "Your password reset code",
  };
  const subject = subjectMap[type] ?? "Your verification code";

  if (!resend) {
    console.log("========================================");
    console.log(`OTP EMAIL (Development Mode) — ${type}`);
    console.log("========================================");
    console.log(`To: ${email}`);
    console.log(`Code: ${otp}`);
    console.log("========================================");
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f9; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 48px; height: 48px; background: #1f2937; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                <div style="width: 32px; height: 32px; border: 2px solid white; border-radius: 50%;"></div>
              </div>
              <h2 style="color: #1f2937; margin: 16px 0 0 0; font-size: 18px; font-weight: 500;">TEMERITY</h2>
            </div>

            <h1 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">${subject}</h1>

            <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              Enter this code to continue:
            </p>

            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background: #f3f4f6; padding: 16px 32px; border-radius: 12px; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #1f2937; font-family: monospace;">
                ${otp}
              </div>
            </div>

            <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
              This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send OTP email:", error);
    }
  } catch (error) {
    console.error("Failed to send OTP email:", error);
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  // If no Resend API key, log to console (development mode)
  if (!resend) {
    console.log("========================================");
    console.log("PASSWORD RESET EMAIL (Development Mode)");
    console.log("========================================");
    console.log(`To: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log("========================================");
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Reset your password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f9; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 48px; height: 48px; background: #1f2937; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                <div style="width: 32px; height: 32px; border: 2px solid white; border-radius: 50%;"></div>
              </div>
              <h2 style="color: #1f2937; margin: 16px 0 0 0; font-size: 18px; font-weight: 500;">TEMERITY</h2>
            </div>

            <h1 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">Reset your password</h1>

            <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              We received a request to reset your password. Click the button below to create a new password.
            </p>

            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${resetUrl}" style="display: inline-block; background: #1f2937; color: white; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-size: 16px; font-weight: 500;">
                Reset Password
              </a>
            </div>

            <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; text-align: center;">
              This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #6b7280; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send password reset email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

export async function sendWaitlistConfirmationEmail(
  email: string
): Promise<void> {
  if (!resend) {
    console.log("========================================");
    console.log("WAITLIST EMAIL (Development Mode)");
    console.log("========================================");
    console.log(`To: ${email}`);
    console.log("Message: You're on the waitlist!");
    console.log("========================================");
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "You're on the TEMERITY waitlist!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f9; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 48px; height: 48px; background: #1f2937; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                <div style="width: 32px; height: 32px; border: 2px solid white; border-radius: 50%;"></div>
              </div>
              <h2 style="color: #1f2937; margin: 16px 0 0 0; font-size: 18px; font-weight: 500;">TEMERITY</h2>
            </div>

            <h1 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">You're on the waitlist!</h1>

            <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              Thanks for signing up. We're building something special for construction teams &mdash; Gantt scheduling, document control, and team coordination all in one place.
            </p>

            <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              We'll let you know as soon as early access is ready. You'll be among the first to try it out.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              You're receiving this because you signed up for the TEMERITY waitlist.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send waitlist confirmation email:", error);
    }
  } catch (error) {
    console.error("Failed to send waitlist confirmation email:", error);
  }
}

export async function sendInvitationEmail(
  email: string,
  orgName: string,
  inviterName: string,
  token: string,
  projectName?: string,
): Promise<{ success: boolean; error?: string }> {
  const inviteUrl = `${env.APP_URL}/invite/${token}`;
  const safeInviterName = escapeHtml(inviterName);
  const safeOrgName = escapeHtml(orgName);
  const safeProjectName = projectName ? escapeHtml(projectName) : null;

  // If no Resend API key, surface error in production, log to console in development
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "Email service not configured (missing RESEND_API_KEY)" };
    }
    console.log("========================================");
    console.log("INVITATION EMAIL (Development Mode)");
    console.log("========================================");
    console.log(`To: ${email}`);
    console.log(`Organization: ${orgName}`);
    if (projectName) console.log(`Project: ${projectName}`);
    console.log(`Invited by: ${inviterName}`);
    console.log(`Invite URL: ${inviteUrl}`);
    console.log("========================================");
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: safeProjectName
        ? `${inviterName} invited you to ${projectName} on ${orgName}`
        : `${inviterName} invited you to join ${orgName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f9; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 48px; height: 48px; background: #1f2937; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                <div style="width: 32px; height: 32px; border: 2px solid white; border-radius: 50%;"></div>
              </div>
              <h2 style="color: #1f2937; margin: 16px 0 0 0; font-size: 18px; font-weight: 500;">TEMERITY</h2>
            </div>

            <h1 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">You're invited!</h1>

            <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              <strong>${safeInviterName}</strong> has invited you to join ${safeProjectName ? `<strong>${safeProjectName}</strong> at ` : ""}<strong>${safeOrgName}</strong> on TEMERITY.
            </p>

            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${inviteUrl}" style="display: inline-block; background: #1f2937; color: white; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-size: 16px; font-weight: 500;">
                Accept Invitation
              </a>
            </div>

            <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; text-align: center;">
              This invitation will expire in 7 days. If you don't have a TEMERITY account yet, you'll be able to create one.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${inviteUrl}" style="color: #6b7280; word-break: break-all;">${inviteUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send invitation email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

