import type { CandidateApplicationStatus, Language } from '../types';

export type ApplicationActionTone = 'applied' | 'approved' | 'rejected' | 'withdrawn' | 'interview' | 'invited';

export interface ApplicationActionState {
  label: string;
  detail: string;
  tone: ApplicationActionTone;
}

export function getApplicationActionState(
  status: CandidateApplicationStatus,
  language: Language,
): ApplicationActionState {
  const vi = language === 'vi';

  switch (status) {
    case 'APPROVED':
      return {
        label: vi ? 'Đã được chấp nhận' : 'Application approved',
        detail: vi ? 'Nhà tuyển dụng đã chấp nhận hồ sơ này.' : 'The recruiter has approved this application.',
        tone: 'approved',
      };
    case 'REJECTED':
      return {
        label: vi ? 'Đã bị từ chối' : 'Application rejected',
        detail: vi
          ? 'Hồ sơ đã bị từ chối. Hệ thống hiện không cho ứng tuyển lại vào cùng JD.'
          : 'This application was rejected. Reapplying to the same job is not currently supported.',
        tone: 'rejected',
      };
    case 'INVITED':
      return {
        label: vi ? 'Đã được mời' : 'Invitation received',
        detail: vi ? 'Nhà tuyển dụng đã gửi lời mời cho công việc này.' : 'The recruiter has invited you to this job.',
        tone: 'invited',
      };
    case 'NOT_INTERESTED':
      return {
        label: vi ? 'Đã rút hồ sơ' : 'Application withdrawn',
        detail: vi
          ? 'Bạn đã rút hồ sơ và không thể ứng tuyển lại vào cùng JD.'
          : 'You withdrew this application and cannot reapply to the same job.',
        tone: 'withdrawn',
      };
    case 'INTERVIEW_RESCHEDULED':
      return {
        label: vi ? 'Đã đổi lịch phỏng vấn' : 'Interview rescheduled',
        detail: vi ? 'Lịch phỏng vấn của hồ sơ này đã được thay đổi.' : 'The interview for this application was rescheduled.',
        tone: 'interview',
      };
    case 'INTERVIEW_CANCELLED':
      return {
        label: vi ? 'Phỏng vấn đã hủy' : 'Interview cancelled',
        detail: vi ? 'Lịch phỏng vấn của hồ sơ này đã bị hủy.' : 'The interview for this application was cancelled.',
        tone: 'rejected',
      };
    case 'AUTO_APPLIED':
      return {
        label: vi ? 'AutoFit đã ứng tuyển' : 'Applied by AutoFit',
        detail: vi ? 'AutoFit đã gửi hồ sơ cho công việc này.' : 'AutoFit submitted this application.',
        tone: 'applied',
      };
    case 'PENDING':
    default:
      return {
        label: vi ? 'Đã ứng tuyển' : 'Applied',
        detail: vi ? 'Hồ sơ đã được gửi và đang chờ nhà tuyển dụng xử lý.' : 'Your application was submitted and is awaiting review.',
        tone: 'applied',
      };
  }
}
