import { defineLocale } from './define-locale'

export const vi = defineLocale({
  common: {
    apply: 'Áp dụng',
    back: 'Quay lại',
    save: 'Lưu',
    saving: 'Đang lưu...',
    cancel: 'Hủy',
    change: 'Thay đổi',
    choose: 'Chọn',
    clear: 'Xóa',
    close: 'Đóng',
    collapse: 'Thu gọn',
    confirm: 'Xác nhận',
    connect: 'Kết nối',
    connecting: 'Đang kết nối',
    continue: 'Tiếp tục',
    copied: 'Đã sao chép',
    copy: 'Sao chép',
    copyFailed: 'Sao chép thất bại',
    delete: 'Xóa',
    docs: 'Tài liệu',
    done: 'Xong',
    error: 'Lỗi',
    expand: 'Mở rộng',
    failed: 'Thất bại',
    formatJson: 'Định dạng JSON',
    free: 'Miễn phí',
    loading: 'Đang tải...',
    notSet: 'Chưa đặt',
    refresh: 'Làm mới',
    remove: 'Gỡ',
    replace: 'Thay thế',
    retry: 'Thử lại',
    run: 'Chạy',
    send: 'Gửi',
    set: 'Đặt',
    skip: 'Bỏ qua',
    update: 'Cập nhật',
    tryHint: term => `Thử "${term}"`,
    on: 'Bật',
    off: 'Tắt'
  },

  sidebar: {
    nav: {
      'new-session': 'Cuộc trò chuyện mới',
      skills: 'Kỹ năng',
      messaging: 'Tin nhắn',
      artifacts: 'Tài liệu',
      cron: 'Lịch công việc'
    },
    searchAria: 'Tìm cuộc trò chuyện',
    searchPlaceholder: 'Tìm cuộc trò chuyện...',
    noMatch: query => `Không có cuộc trò chuyện nào khớp "${query}".`,
    results: 'Kết quả',
    pinned: 'Đã ghim',
    sessions: 'Gần đây',
    cronJobs: 'Lịch công việc',
    allPinned: 'Tất cả cuộc trò chuyện ở đây đã được ghim.',
    shiftClickHint: 'Ghim cuộc trò chuyện quan trọng',
    noWorkspace: 'Không có thư mục làm việc',
    projectEmpty: 'Chưa có cuộc trò chuyện',
    noSessions: 'Chưa có cuộc trò chuyện',
    noFilterMatches: 'Không có cuộc trò chuyện khớp bộ lọc',
    projects: {
      sectionLabel: 'Dự án',
      home: 'Trang chính',
      newButton: 'Dự án mới',
      createTitle: 'Dự án mới',
      createDesc: 'Đặt tên không gian làm việc và thêm thư mục.',
      namePlaceholder: 'Ví dụ: Báo cáo tháng',
      foldersLabel: 'Thư mục',
      addFolder: 'Thêm thư mục',
      create: 'Tạo',
      menu: 'Tác vụ',
      menuRename: 'Đổi tên...',
      menuAppearance: 'Giao diện',
      menuAddFolder: 'Thêm thư mục',
      menuSetActive: 'Đặt làm hiện tại',
      menuDelete: 'Xóa',
      moveToProject: 'Chuyển vào dự án',
      moveFailed: 'Không thể chuyển cuộc trò chuyện',
      moveNoFolder: 'Dự án này chưa có thư mục',
      moveNoProjects: 'Không có dự án khác',
      reveal: 'Mở trong thư mục',
      copyPath: 'Sao chép đường dẫn',
      removeFromSidebar: 'Ẩn khỏi thanh bên',
      createFailed: 'Không thể tạo dự án',
      staleBackend: 'Cập nhật backend Hermes để tạo dự án.',
      deleteConfirm: 'Thao tác này chỉ gỡ dự án khỏi Hermes. File và repo git vẫn được giữ nguyên.',
      startWork: 'Nhánh làm việc mới',
      newWorktreeTitle: 'Nhánh làm việc mới',
      newWorktreeDesc: 'Đặt tên nhánh cho phần việc này.',
      branchPlaceholder: 'Ví dụ: cap-nhat-bao-cao',
      baseBranchPlaceholder: 'Tìm nhánh...',
      baseBranchNone: 'Không tìm thấy nhánh',
      startWorkFailed: 'Không thể tạo nhánh làm việc',
      worktreeProjectLabel: 'Dự án',
      worktreeProjectPlaceholder: 'Tìm dự án...',
      worktreeProjectNone: 'Không có dự án có thư mục',
      convertBranch: 'Chuyển từ nhánh...',
      convertBranchTitle: 'Chuyển từ nhánh',
      convertBranchDesc: 'Mở nhánh đã checkout hoặc tạo worktree cho nhánh còn trống.',
      convertBranchPlaceholder: 'Tìm nhánh...',
      convertBranchInstead: 'Chuyển từ nhánh có sẵn',
      branchOpenExisting: 'mở',
      branchSwitchHome: 'chuyển về chính',
      branchCreateWorktree: 'worktree mới',
      branchTrackRemote: 'theo dõi remote',
      branchesLoading: 'Đang tải nhánh...',
      noBranches: 'Không tìm thấy nhánh',
      removeWorktree: 'Gỡ worktree',
      removeWorktreeFailed: 'Không thể gỡ worktree',
      forceRemove: 'Gỡ bắt buộc',
      back: 'Tất cả dự án'
    },
    newSessionIn: label => `Cuộc trò chuyện mới trong ${label}`,
    showMoreIn: (count, label) => `Hiện thêm ${count} trong ${label}`,
    loading: 'Đang tải...',
    loadMore: 'Tải thêm',
    loadCount: step => `Tải thêm ${step}`,
    messageCount: count => `${count} tin nhắn`,
    toolCallCount: count => `${count} lần dùng công cụ`,
    row: {
      pin: 'Ghim',
      unpin: 'Bỏ ghim',
      markUnread: 'Đánh dấu chưa đọc',
      markRead: 'Đánh dấu đã đọc',
      unreadFailed: 'Không thể cập nhật trạng thái đọc',
      copyId: 'Sao chép ID',
      export: 'Xuất',
      branchFrom: 'Tạo nhánh',
      rename: 'Đổi tên...',
      archive: 'Lưu trữ',
      newWindow: 'Cửa sổ mới',
      openInTerminal: 'Mở terminal',
      openInNewTab: 'Mở tab mới',
      openInSplit: 'Mở chia màn hình',
      sessionActions: 'Tác vụ cuộc trò chuyện',
      sessionRunning: 'Đang xử lý',
      needsInput: 'Cần bạn trả lời',
      waitingForAnswer: 'Đang chờ bạn trả lời',
      finishedUnread: 'Đã xong - chưa đọc',
      backgroundRunning: 'Tác vụ nền đang chạy',
      draftSession: 'Bản nháp - chưa gửi',
      handoffOrigin: platform => `Chuyển tiếp từ ${platform}`,
      ownedByProfile: profile => `Hồ sơ: ${profile}`,
      renamed: 'Đã đổi tên',
      renameFailed: 'Đổi tên thất bại',
      renameTitle: 'Đổi tên cuộc trò chuyện',
      renameDesc: 'Để trống để xóa tên.',
      untitledPlaceholder: 'Cuộc trò chuyện chưa đặt tên',
      deleteTitle: 'Xóa cuộc trò chuyện?',
      deleteDesc: title => `Thao tác này sẽ xóa vĩnh viễn "${title}".`,
      deleting: 'Đang xóa...',
      deleted: 'Đã xóa cuộc trò chuyện',
      untitledChat: id => `Trò chuyện ${id}`,
      todoProgress: 'Công việc đã xong',
      ageNow: 'vừa xong',
      ageDay: 'ng',
      ageHour: 'g',
      ageMin: 'p'
    },
    dateDivider: {
      today: 'Hôm nay',
      yesterday: 'Hôm qua',
      thisWeek: 'Tuần này',
      lastWeek: 'Tuần trước',
      thisMonth: 'Tháng này'
    },
    statusDivider: {
      working: 'Đang làm',
      done: 'Đã xong'
    },
    markAllRead: 'Đánh dấu tất cả đã đọc'
  },

  skills: {
    sortMostUsed: 'Dùng nhiều',
    sortMostUsedDesc: '↓ Dùng nhiều'
  },

  composer: {
    startVoice: 'Bắt đầu trò chuyện bằng giọng nói',
    voiceControls: 'Giọng nói',
    voiceDictation: 'Nhập bằng giọng nói'
  },

  shell: {
    gatewayMenu: {
      gateway: 'Kết nối',
      connected: 'Đã kết nối',
      connecting: 'Đang kết nối',
      offline: 'Ngoại tuyến',
      inferenceReady: 'Đã kết nối',
      inferenceNotReady: 'Chưa sẵn sàng',
      checkingInference: 'Đang kiểm tra',
      disconnected: 'Mất kết nối',
      reconnectGateway: 'Kết nối lại',
      openSystem: 'Mở bảng hệ thống',
      connection: label => `Kết nối: ${label}`,
      recentActivity: 'Hoạt động gần đây',
      viewAllLogs: 'Xem tất cả log →',
      messagingPlatforms: 'Kênh tin nhắn'
    },
    statusbar: {
      gateway: 'Kết nối',
      gatewayReady: 'Đã kết nối',
      gatewayNeedsSetup: 'Cần thiết lập',
      gatewayUnavailable: 'Chưa có suy luận',
      gatewayChecking: 'Đang kiểm tra',
      gatewayConnecting: 'Đang kết nối',
      gatewayOffline: 'Ngoại tuyến',
      gatewayRestarting: 'Đang khởi động lại…',
      gatewayTitle: 'Kết nối'
    }
  },

  internalWorkspace: {
    brand: {
      name: 'Lemon AI',
      tagline: 'Trợ lý công việc'
    },
    nav: {
      chat: 'Trò chuyện',
      skills: 'Kỹ năng',
      documents: 'Tài liệu',
      schedule: 'Lịch công việc',
      settings: 'Cài đặt'
    },
    actions: {
      newConversation: 'Cuộc trò chuyện mới',
      openSettings: 'Mở cài đặt'
    },
    home: {
      heading: 'Hôm nay bạn cần hỗ trợ gì?',
      supporting: 'Viết nội dung, tìm thông tin hoặc xử lý tài liệu - bắt đầu bằng một yêu cầu.'
    },
    starters: {
      writeContent: {
        title: 'Viết nội dung',
        description: 'Soạn bài đăng, email hoặc thông báo ngắn.',
        draft: 'Hỗ trợ tôi viết nội dung cho '
      },
      summarizeDocument: {
        title: 'Tóm tắt tài liệu',
        description: 'Rút ra ý chính và việc cần làm tiếp theo.',
        draft: 'Tóm tắt tài liệu này và liệt kê các ý chính: '
      },
      analyzeReport: {
        title: 'Phân tích báo cáo',
        description: 'Xem số liệu, rủi ro và điểm thay đổi.',
        draft: 'Phân tích báo cáo này và chỉ ra các thay đổi quan trọng: '
      },
      planWork: {
        title: 'Lên kế hoạch',
        description: 'Biến một ý tưởng thành bước làm, người phụ trách và thời gian.',
        draft: 'Lập kế hoạch công việc cho '
      }
    },
    composer: {
      placeholder: 'Nhập yêu cầu của bạn...',
      send: 'Gửi',
      attach: 'Đính kèm',
      fast: 'Nhanh',
      deep: 'Chuyên sâu'
    },
    skills: {
      title: 'Kỹ năng',
      description: 'Chọn những kỹ năng giúp Lemon AI làm việc cùng bạn.',
      skillsTab: 'Kỹ năng',
      connectionsTab: 'Kết nối',
      createSkill: 'Tạo kỹ năng',
      searchPlaceholder: 'Tìm kỹ năng...',
      defaultSummary: 'Chọn một kỹ năng để xem tóm tắt và tác vụ.',
      enabledLabel: 'Đang bật',
      technicalDetails: 'Chi tiết kỹ thuật',
      connect: 'Kết nối',
      signIn: 'Đăng nhập',
      retry: 'Thử lại'
    },
    sidebar: {
      recent: 'Gần đây',
      emptyRecent: 'Chưa có cuộc trò chuyện',
      searchPlaceholder: 'Tìm cuộc trò chuyện...',
      noMatches: query => `Không có cuộc trò chuyện nào khớp "${query}".`,
      pinnedHint: 'Ghim cuộc trò chuyện quan trọng',
      emptyProject: 'Chưa có cuộc trò chuyện'
    },
    technicalDetails: 'Chi tiết kỹ thuật'
  }
})
