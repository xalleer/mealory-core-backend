import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });

  async sendPasswordResetOtp(email: string, otp: string) {
    const from = process.env.SMTP_FROM;
    if (!from) {
      throw new Error('SMTP_FROM is not set');
    }

    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Password reset code',
      text: `Your password reset code is: ${otp}. It expires in 10 minutes.`,
    });
  }

  async sendSupportTicketNotification(params: {
    to: string;
    userEmail: string;
    userName: string;
    ticketId: string;
    subject: string;
    priority: string;
    message: string;
  }) {
    const from = process.env.SMTP_FROM;
    if (!from) {
      throw new Error('SMTP_FROM is not set');
    }

    await this.transporter.sendMail({
      from,
      to: params.to,
      subject: `Support ticket: ${params.subject} [${params.priority}]`,
      text: [
        `Ticket ID: ${params.ticketId}`,
        `User: ${params.userName} <${params.userEmail}>`,
        `Priority: ${params.priority}`,
        '',
        params.message,
      ].join('\n'),
    });
  }
}
