package com.careerfit.backend.job.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JobDescriptionSanitizerTest {

    @Test
    void removesScrapedMetadataAndRestoresSectionsAndBullets() {
        String raw = """
                Địa điểm Hồ Chí Minh Ngày cập nhật 09/06/2026 Ngành nghề Tiếp thị / Marketing
                Hình thức Nhân viên chính thức Lương Cạnh tranh Kinh nghiệm 3 - 5 Năm
                Mô tả Công việc KẾT NỐI ĐỐI TÁC. TẠO CƠ HỘI.
                BẠN SẼ LÀM GÌ? • Phát triển và duy trì quan hệ đối tác • Theo dõi pipeline trên CRM.
                Yêu Cầu Công Việc CHÚNG TÔI TÌM KIẾM AI? • Có 3-5 năm kinh nghiệm • Tiếng Anh tốt.
                Quyền lợi • Bảo hiểm sức khỏe • Thiết bị làm việc.
                """;

        String cleaned = JobDescriptionSanitizer.clean(raw);

        assertThat(cleaned)
                .doesNotContain("Địa điểm Hồ Chí Minh")
                .startsWith("KẾT NỐI ĐỐI TÁC")
                .contains("\n\nBẠN SẼ LÀM GÌ?\n")
                .contains("\n• Phát triển và duy trì quan hệ đối tác")
                .contains("\n\nYêu Cầu Công Việc\n")
                .contains("\n\nQuyền lợi\n");
    }

    @Test
    void doesNotSplitOrdinarySentencesContainingRequirementOrBenefitWords() {
        String raw = """
                Mô tả công việc
                Phối hợp với quản lý theo yêu cầu của dự án.
                Trách nhiệm công việc: • Duy trì sản phẩm mang lại quyền lợi lâu dài cho khách hàng.
                Yêu cầu ứng viên: • Có kinh nghiệm React.
                """;

        String cleaned = JobDescriptionSanitizer.clean(raw);

        assertThat(cleaned)
                .contains("theo yêu cầu của dự án")
                .contains("mang lại quyền lợi lâu dài cho khách hàng")
                .contains("\n\nYêu cầu ứng viên:\n");
    }
}
