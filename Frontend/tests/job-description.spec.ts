import { expect, test } from '@playwright/test';

test('Job detail removes scraped metadata and renders real JD sections', async ({ page }) => {
  const rawDescription = [
    'Địa điểm Hồ Chí Minh Ngày cập nhật 09/06/2026 Ngành nghề Tiếp thị / Marketing',
    'Hình thức Nhân viên chính thức Lương Cạnh tranh Kinh nghiệm 3 - 5 Năm',
    'Mô tả Công việc KẾT NỐI ĐỐI TÁC. TẠO CƠ HỘI.',
    'BẠN SẼ LÀM GÌ? • Phát triển và duy trì quan hệ đối tác.',
    '• Phối hợp theo yêu cầu của khách hàng để tạo quyền lợi lâu dài và theo dõi pipeline trên CRM.',
    'Yêu Cầu Công Việc CHÚNG TÔI TÌM KIẾM AI?',
    '• Có 3-5 năm kinh nghiệm. • Tiếng Anh tốt.',
    'Quyền lợi • Bảo hiểm sức khỏe. • Thiết bị làm việc.',
  ].join(' ');

  await page.route('**/api/jobs/messy-jd', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: {
        id: 'messy-jd',
        title: 'Senior Partner Executive',
        company: 'OMN1',
        location: 'Ho Chi Minh City',
        seniorityLevel: 'Senior',
        employmentType: 'FULL_TIME',
        salary: { displayText: 'Thỏa thuận', isVisible: true },
        requiredSkills: ['Partnership', 'CRM'],
        niceToHaveSkills: [],
        originalText: rawDescription,
        status: 'ACTIVE',
        createdAt: '2026-07-18T00:00:00Z',
        updatedAt: '2026-07-25T00:00:00Z',
      },
    }),
  }));

  await page.goto('/jobs/messy-jd');

  const content = page.locator('.jd-main-content');
  await expect(page.getByRole('heading', { name: 'Senior Partner Executive' })).toBeVisible();
  await expect(content).not.toContainText('Địa điểm Hồ Chí Minh Ngày cập nhật');
  await expect(content).toContainText('KẾT NỐI ĐỐI TÁC. TẠO CƠ HỘI.');
  await expect(content.getByRole('heading', { name: 'Trách nhiệm chính' })).toBeVisible();
  await expect(content).toContainText('Phối hợp theo yêu cầu của khách hàng');
  await expect(content).toContainText('tạo quyền lợi lâu dài');
  await expect(content.getByRole('heading', { name: 'Yêu cầu công việc' })).toBeVisible();
  await expect(content).toContainText('Có 3-5 năm kinh nghiệm.');
  await expect(content.getByRole('heading', { name: 'Quyền lợi' })).toBeVisible();
  await expect(content).toContainText('Bảo hiểm sức khỏe.');
  await expect(content).not.toContainText('Thiết kế và phát hành các luồng');
});
