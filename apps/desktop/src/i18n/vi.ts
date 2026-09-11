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
      staleBackend: 'Cập nhật runtime Lemon AI để tạo dự án.',
      deleteConfirm: 'Thao tác này chỉ gỡ dự án khỏi Lemon AI. File và repo git vẫn được giữ nguyên.',
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
      messagingPlatforms: 'Kênh tin nhắn',
      aiConnectionMissingTitle: 'Chưa có kết nối AI sẵn sàng',
      aiConnectionMissingDetail: 'Thêm kết nối AI trước khi bắt đầu trò chuyện với Lemon AI.',
      openAiConnection: 'Mở Kết nối AI',
      provisioningUnknownTitle: 'Chưa rõ trạng thái thiết lập',
      provisioningUnknownDetail: 'Runtime chưa báo trạng thái sẵn sàng.',
      provisioningIncompleteTitle: 'Thiết lập chưa hoàn tất',
      provisioningIncompleteDetail: 'Thiếu một hoặc nhiều nhóm thiết lập bắt buộc.'
    },
    statusbar: {
      gateway: 'Kết nối',
      gatewayReady: 'Đã kết nối',
      gatewayNeedsSetup: 'Cần thiết lập',
      gatewayNeedsAiConnection: 'Chưa có kết nối AI sẵn sàng',
      gatewayUnavailable: 'Chưa có suy luận',
      gatewayChecking: 'Đang kiểm tra',
      gatewayConnecting: 'Đang kết nối',
      gatewayOffline: 'Ngoại tuyến',
      gatewayRestarting: 'Đang khởi động lại…',
      gatewayTitle: 'Kết nối'
    }
  },

  boot: {
    ready: 'Lemon AI đã sẵn sàng',
    steps: {
      loadingSettings: 'Đang tải cài đặt Lemon AI',
      retryingRemoteBackend: 'Đang kết nối lại tới backend từ xa…',
      startingHermesDesktop: 'Đang khởi động Lemon AI…'
    },
    errors: {
      backgroundExited: 'Tiến trình nền Lemon AI đã thoát.',
      backgroundExitedDuringStartup: 'Tiến trình nền Lemon AI đã thoát khi khởi động.'
    },
    failure: {
      title: 'Lemon AI không khởi động được',
      description:
        'Gateway nền chưa chạy được. Thử một bước khôi phục bên dưới; cuộc trò chuyện và cài đặt vẫn được giữ nguyên.',
      repairInstall: 'Sửa cài đặt',
      useLocalGateway: 'Dùng gateway trên máy',
      gatewaySettings: 'Cài đặt kết nối',
      openLogs: 'Mở log',
      repairHint: 'Sửa cài đặt sẽ chạy lại bộ cài và có thể mất vài phút trên máy mới.'
    }
  },

  settings: {
    nav: {
      about: 'Về Lemon AI',
      providerCustomEndpoints: 'Kết nối AI'
    },
    resetConfirm: 'Đặt lại toàn bộ cài đặt Lemon AI về mặc định?',
    about: {
      heading: 'Lemon AI',
      bundleOutOfSyncDesc:
        'Runtime Lemon AI đã được cập nhật, nhưng app desktop vẫn là bản cũ. Cập nhật hoặc cài lại bằng bộ cài mới nhất.',
      bundleSwapPendingDesc:
        'Bản cập nhật đã được cài. Khởi động lại Lemon AI để dùng phiên bản mới; cuộc trò chuyện và cài đặt vẫn được giữ nguyên.',
      bundleSwapPendingAction: 'Khởi động lại Lemon AI',
      automaticUpdatesDesc: 'Lemon AI tự kiểm tra bản cập nhật trong nền và báo khi có bản mới.'
    },
    aiConnection: {
      title: 'Kết nối AI',
      intro: 'Thay đổi nơi Lemon AI gửi yêu cầu và model bạn muốn dùng.',
      savedConnections: 'Kết nối đã lưu',
      addConnection: 'Thêm kết nối',
      currentBadge: 'Đang dùng',
      selectedForEditing: 'Đang chọn để chỉnh sửa',
      savedKey: 'Đã lưu khóa truy cập',
      editTitle: 'Chỉnh sửa kết nối',
      newTitle: 'Thêm kết nối',
      nameLabel: 'Tên kết nối',
      namePlaceholder: 'AI công ty',
      urlLabel: 'Địa chỉ máy chủ',
      urlHelp: 'Nhập đầy đủ base URL của dịch vụ tương thích OpenAI, bao gồm đường dẫn riêng nếu có.',
      keyLabel: 'Khóa truy cập (API key)',
      keyAriaLabel: 'API key',
      keyExistingPlaceholder: 'Để trống để giữ khóa đã lưu',
      keyNewPlaceholder: 'Không bắt buộc',
      keyExistingHelp: 'Với kết nối đã lưu, để trống trường này sẽ giữ nguyên khóa hiện có.',
      keyNewHelp: 'Có thể để trống nếu dịch vụ này không yêu cầu khóa.',
      modelLabel: 'Model',
      modelPlaceholder: 'ten-model',
      modelHelp: 'Dùng tên model từ dịch vụ AI. Bạn luôn có thể nhập thủ công.',
      saveAndUse: 'Lưu và sử dụng',
      testConnection: 'Kiểm tra kết nối',
      cancelChanges: 'Hủy thay đổi',
      saveScope: 'Kết nối đã lưu sẽ dùng cho cuộc trò chuyện mới. Cuộc trò chuyện hiện có có thể giữ model đã chọn.',
      loadFailed: 'Không thể tải kết nối AI.',
      saveFailed: 'Không thể lưu kết nối này. Kiểm tra thông tin rồi thử lại.',
      saved: 'Đã lưu. Cuộc trò chuyện mới sẽ dùng kết nối này.',
      invalidUrl: 'Nhập đầy đủ địa chỉ máy chủ bắt đầu bằng http:// hoặc https://.',
      requiredFields: 'Nhập tên kết nối, địa chỉ máy chủ và model.',
      validationReachable: 'Dịch vụ AI đã trả lời yêu cầu danh sách model.',
      validationModels: count => `Tìm thấy ${count} model. Bạn có thể chọn một model hoặc nhập thủ công.`,
      validationFailed: 'Không kết nối được tới dịch vụ AI. Kiểm tra địa chỉ và khóa rồi thử lại.'
    }
  },

  install: {
    stageStates: {
      pending: 'Đang chờ',
      running: 'Đang cài',
      succeeded: 'Xong',
      skipped: 'Bỏ qua',
      failed: 'Thất bại'
    },
    oneTimeTitle: 'Lemon AI cần cài đặt lần đầu',
    unsupportedDesc: platform =>
      `Chưa hỗ trợ cài tự động lần đầu trên ${platform}. Mở Terminal, chạy lệnh bên dưới rồi mở lại Lemon AI. Các lần sau sẽ bỏ qua bước này.`,
    installCommand: 'Lệnh cài đặt',
    copyCommand: 'Sao chép lệnh',
    viewDocs: 'Xem hướng dẫn cài đặt',
    installTo: 'Sẽ cài vào',
    retryAfterRun: 'Tôi đã chạy lệnh - thử lại',
    setupChoiceTitle: 'Thiết lập Lemon AI',
    setupChoiceDesc: 'Kết nối app với gateway đang chạy, hoặc cài runtime Lemon AI trên máy này.',
    connectExistingTitle: 'Kết nối gateway có sẵn',
    connectExistingShort: 'Kết nối có sẵn',
    connectExistingDesc: 'Dùng backend từ xa với token phiên hoặc đăng nhập trình duyệt. Không bắt đầu cài local.',
    installLocalTitle: 'Cài trên máy này',
    installLocalDesc: 'Tải runtime Lemon AI, tạo môi trường Python và chạy backend trên máy này.',
    localStartUnavailable: 'Không thể bắt đầu cài trên máy này. Khởi động lại Lemon AI rồi thử lại.',
    remoteSetupTitle: 'Kết nối gateway có sẵn',
    remoteSetupDesc: 'Nhập URL gateway. Lemon AI sẽ kiểm tra cần token hay đăng nhập trình duyệt.',
    remoteUrlDesc: 'Dùng base URL của gateway, bao gồm https:// nếu là máy từ xa.',
    remoteUrlPlaceholder: 'https://gateway.example.com/lemon-ai',
    probeError: 'Không kết nối được tới gateway này.',
    signInIncomplete: 'Cửa sổ đăng nhập đã đóng trước khi xác thực hoàn tất.',
    failedTitle: 'Cài đặt thất bại',
    settingUpTitle: 'Đang thiết lập Lemon AI',
    failedDesc:
      'Một bước cài đặt thất bại. Trên Windows, lỗi này có thể xảy ra nếu một phiên CLI hoặc desktop khác đang chạy. Đóng phiên đang chạy rồi thử lại. Xem chi tiết bên dưới hoặc log desktop để có transcript đầy đủ.',
    activeDesc:
      'Đây là bước cài một lần. Bộ cài Lemon AI đang tải dependency và cấu hình máy. Các lần mở sau sẽ bỏ qua bước này.',
    fetchingManifest: 'Đang tải manifest cài đặt...',
    hideOutput: 'Ẩn log cài đặt',
    showOutput: 'Hiện log cài đặt',
    noOutput: 'Chưa có log.',
    cancelling: 'Đang hủy...',
    cancelInstall: 'Hủy cài đặt',
    transcriptSaved: 'Transcript đầy đủ đã lưu tại',
    logsFolderFallback: 'thư mục log của app',
    copiedOutput: 'Đã sao chép!',
    copyOutput: 'Sao chép log',
    reloadRetry: 'Tải lại và thử lại'
  },

  onboarding: {
    headerTitle: 'Thiết lập Lemon AI',
    headerDesc: 'Kết nối dịch vụ AI để bắt đầu trò chuyện.',
    preparingInstall: 'Lemon AI đang hoàn tất cài đặt. Lần đầu thường mất dưới một phút.',
    starting: 'Đang khởi động Lemon AI…',
    featuredPitch: 'Kết nối AI công ty - cách dùng Lemon AI được khuyến nghị',
    localModelsPitch: 'Chạy model trên máy này nếu công ty bật lựa chọn local.',
    apiKeyOptions: {
      local: {
        description: 'Trỏ Lemon AI tới endpoint tương thích OpenAI nội bộ hoặc tự host.'
      }
    },
    authorizeThere: 'Xác nhận Lemon AI tại đó.',
    autoBrowser: provider =>
      `Đã mở ${provider} trong trình duyệt. Xác nhận Lemon AI tại đó và app sẽ tự kết nối - không cần copy/paste.`
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
