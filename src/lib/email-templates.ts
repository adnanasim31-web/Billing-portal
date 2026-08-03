export interface InviteEmailParams {
  heading: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
}

/** Shared minimal layout for the two invite emails (staff + patient portal). */
export function renderInviteEmail({ heading, body, actionLabel, actionUrl }: InviteEmailParams): string {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #0A2A22;">
    <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #059669; font-weight: 600;">MedBill RCM Suite</p>
    <h1 style="font-size: 20px; margin: 8px 0 16px;">${heading}</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #374151;">${body}</p>
    <p style="margin: 24px 0;">
      <a href="${actionUrl}" style="background: #059669; color: #fff; padding: 10px 20px; border-radius: 9999px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">${actionLabel}</a>
    </p>
    <p style="font-size: 12px; color: #6b7280;">If the button doesn't work, copy and paste this link into your browser:<br />${actionUrl}</p>
  </div>`;
}
