import i18n from "i18next"
import { initReactI18next } from "react-i18next"

export type AppLocale =
  | "en-US"
  | "ru-RU"
  | "tk-TM"
  | "tr-TR"
  | "uz-UZ"
  | "ar-AE"

const LOCALE_STORAGE_KEY = "locale"
const DEFAULT_LOCALE: AppLocale = "en-US"
const RTL_LOCALES = new Set<AppLocale>(["ar-AE"])

const SUPPORTED_LOCALES = [
  "en-US",
  "ru-RU",
  "tk-TM",
  "tr-TR",
  "uz-UZ",
  "ar-AE",
] as const satisfies readonly AppLocale[]

const BASE_LANGUAGE_TO_LOCALE: Record<string, AppLocale> = {
  en: "en-US",
  ru: "ru-RU",
  tk: "tk-TM",
  tr: "tr-TR",
  uz: "uz-UZ",
  ar: "ar-AE",
}

const BACKEND_LANGUAGE_TO_LOCALE: Record<string, AppLocale> = {
  EN: "en-US",
  RU: "ru-RU",
  TK: "tk-TM",
  TR: "tr-TR",
  UZ: "uz-UZ",
  AR: "ar-AE",
}

export const LOCALE_OPTIONS: Array<{ locale: AppLocale; labelKey: string }> = [
  { locale: "en-US", labelKey: "common.english" },
  { locale: "ru-RU", labelKey: "common.russian" },
  { locale: "tk-TM", labelKey: "common.turkmen" },
  { locale: "tr-TR", labelKey: "common.turkish" },
  { locale: "uz-UZ", labelKey: "common.uzbek" },
  { locale: "ar-AE", labelKey: "common.arabic" },
]

const isSupportedLocale = (value?: string | null): value is AppLocale =>
  SUPPORTED_LOCALES.includes(value as AppLocale)

const normalizeLocale = (value?: string | null): AppLocale | null => {
  if (!value) return null

  const canonical = value.trim().replace(/_/g, "-")
  if (!canonical) return null
  if (isSupportedLocale(canonical)) return canonical

  const normalized = canonical.toLowerCase()
  const exactMatch = SUPPORTED_LOCALES.find(
    (locale) => locale.toLowerCase() === normalized,
  )
  if (exactMatch) return exactMatch

  const languagePrefix = normalized.split("-")[0]
  return BASE_LANGUAGE_TO_LOCALE[languagePrefix] ?? null
}

const applyDocumentLocale = (locale: AppLocale) => {
  if (typeof document === "undefined") return

  document.documentElement.lang = locale
  document.documentElement.dir = RTL_LOCALES.has(locale) ? "rtl" : "ltr"
}

const languageToLocale = (language?: string | null): AppLocale => {
  const normalized = (language ?? "").toUpperCase()
  return (
    BACKEND_LANGUAGE_TO_LOCALE[normalized] ??
    normalizeLocale(language) ??
    DEFAULT_LOCALE
  )
}

const resources = {
  "en-US": {
    translation: {
      common: {
        appearance: "Appearance",
        toggleTheme: "Toggle theme",
        theme: {
          light: "Light",
          dark: "Dark",
          system: "System",
        },
        language: "Language",
        english: "English",
        russian: "Russian",
        turkmen: "Turkmen",
        turkish: "Turkish",
        uzbek: "Uzbek",
        arabic: "Arabic",
        actions: "Actions",
        status: "Status",
        role: "Role",
        email: "Email",
        employee: "Employee",
        name: "Name",
        title: "Title",
        username: "Username",
        password: "Password",
        notes: "Notes",
        save: "Save",
        create: "Create",
        edit: "Edit",
        close: "Close",
        loading: "Loading…",
        saving: "Saving…",
        creating: "Creating…",
        uploading: "Uploading…",
        active: "Active",
        inactive: "Inactive",
        completed: "Completed",
        reset: "Reset",
        previous: "Previous",
        next: "Next",
        page: "Page",
        of: "of",
        rowsPerPage: "Rows per page",
        noResultsFound: "No results found.",
        show: "Show",
        hide: "Hide",
        assignee: "Assignee",
        assigned: "Assigned",
        unassigned: "Unassigned",
        noDeadline: "No deadline",
        workspace: "Workspace",
        logout: "Log out",
        project: "Project",
        task: "Task",
        sortBy: "Sort by",
        ascending: "Ascending",
        descending: "Descending",
        deadline: "Deadline",
        urgency: "Urgency",
        complexity: "Complexity",
        entity: "Entity",
        actor: "Actor",
        field: "Field",
        message: "Message",
        system: "System",
      },
      auth: {
        metaTitle: "CabinetryFlow – Login",
        signInTitle: "Sign in to CabinetryFlow",
        description:
          "Enter your username and password to access your workspace.",
        continue: "Continue",
        roleHint:
          "",
      },
      errorPage: {
        title: "Error",
        heading: "Oops!",
        description: "Something went wrong. Please try again.",
        goHome: "Go Home",
      },
      notFoundPage: {
        heading: "Oops!",
        description: "The page you are looking for was not found.",
        goBack: "Go Back",
      },
      footer: {
        template: "CabinetryFlow · {{year}}",
      },
      dataTable: {
        showingRange: "Showing {{start}} to {{end}} of {{total}} entries",
        pageOf: "Page {{page}} of {{total}}",
        goToFirstPage: "Go to first page",
        goToPreviousPage: "Go to previous page",
        goToNextPage: "Go to next page",
        goToLastPage: "Go to last page",
      },
      pdfViewer: {
        previewTechnicalDrawing: "Preview technical drawing",
        pageIndicator: "Page {{page}}",
        pageIndicatorWithTotal: "Page {{page}} of {{total}}",
        zoomOut: "Zoom out",
        zoomIn: "Zoom in",
        openFullPdf: "Open full PDF",
        technicalDrawingPreview: "Technical drawing preview",
      },
      sidebar: {
        title: "Sidebar",
        mobileDescription: "Displays the mobile sidebar.",
        collapse: "Collapse sidebar",
        open: "Open sidebar",
        toggle: "Toggle sidebar",
      },
      passwordInput: {
        hide: "Hide password",
        show: "Show password",
      },
      pagination: {
        ariaLabel: "Pagination",
        goToPreviousPage: "Go to previous page",
        previous: "Previous",
        goToNextPage: "Go to next page",
        next: "Next",
        morePages: "More pages",
      },
      domain: {
        designations: {
          admin: "Admin",
          seniorCarpenter: "Senior Carpenter",
          middleCarpenter: "Middle Carpenter",
          juniorCarpenter: "Junior Carpenter",
          painter: "Painter",
          cncMachinist: "CNC Machinist",
        },
        taskType: {
          cutting: "Cutting",
          assembly: "Assembly",
          disassembly: "Disassembly",
          finishing: "Finishing",
          other: "Other",
        },
        taskStatus: {
          posted: "Posted",
          inProgress: "In progress",
          waitingForApproval: "Waiting for approval",
          waitingForSupply: "Waiting for supply",
          completed: "Completed",
        },
        urgency: {
          extremelyUrgent: "Extremely urgent",
          urgent: "Urgent",
          normal: "Normal",
          low: "Low",
        },
        complexity: {
          simple: "Simple",
          normal: "Normal",
          complex: "Complex",
        },
        logEntity: {
          project: "Project",
          task: "Task",
        },
        logAction: {
          statusUpdated: "Status updated",
          taskAssigned: "Task assigned",
        },
        fields: {
          completed: "Completed",
          status: "Status",
          assignee: "Assignee",
        },
      },
      app: {
        metaTitle: "CabinetryFlow – Workspace",
        tabs: {
          tasks: "Tasks",
          projects: "Projects",
          team: "Team",
          logs: "Logs",
          myTasks: "My Tasks",
        },
        allTasks: "All Tasks",
        projectsHeading: "Projects",
        teamHeading: "Team",
        activityLogs: "Activity Logs",
        myTasksHint:
          "",
        sortTasksHint: "Sort visible tasks by deadline, type, or assignee.",
        sortField: {
          deadline: "Deadline",
          taskType: "Task type",
          assignee: "Assignee",
        },
        loading: {
          logs: "Loading logs…",
          team: "Loading team…",
          projects: "Loading projects…",
          tasks: "Loading tasks…",
        },
        empty: {
          employees: "No employees yet.",
          projects: "No projects yet.",
          tasks: "No tasks yet.",
        },
        dialogs: {
          editEmployeeTitle: "Edit employee",
          editEmployeeDescription:
            "Update the employee record and active status.",
          editProjectTitle: "Edit project",
          editProjectDescription: "Update the project details.",
          newEmployeeTitle: "New employee",
          newEmployeeDescription:
            "Create a new team member. You can update their details later.",
          newProjectTitle: "New project",
          newProjectDescription:
            "Create a project to group related tasks and drawings.",
          newTaskTitle: "New task",
          newTaskDescription:
            "Create a task, assign it to a project and optionally to an employee.",
        },
        form: {
          leaveBlankKeepPassword: "Leave blank to keep current password",
          employeeIsActive: "Employee is active",
          projectCompleted: "Project completed",
          technicalDrawingUrl: "Technical drawing URL",
          threeDModelUrl: "3D model URL",
          miscFileUrls: "Misc file URLs",
          oneUrlPerLine: "One URL per line",
          technicalDrawingPdf: "Technical drawing (PDF)",
          technicalDrawingUploadHint:
            "You can also paste a link instead of uploading.",
          existingPdfLinkPlaceholder: "Or paste an existing PDF link",
          threeDModel: "3D model",
          threeDModelUploadHint:
            "You can also paste a link to an existing model.",
          existing3dModelLinkPlaceholder:
            "Or paste an existing 3D model link",
          miscFiles: "Misc files",
          attachments: "Attachments",
          photosCameraFriendly: "Photos",
          filesSelected_one: "{{count}} file selected",
          filesSelected_other: "{{count}} files selected",
          photosSelected_one: "{{count}} photo selected",
          photosSelected_other: "{{count}} photos selected",
          selectProject: "Select project",
          assigneeOptional: "Assignee (optional)",
        },
        deadlineHelp: "Time is optional and defaults to 5:00 PM.",
        meta: {
          project: "Project",
          assignedTo: "Assigned to",
          deadline: "Deadline",
          urgency: "Urgency",
          status: "Status",
          taskType: "Task type",
          complexity: "Complexity",
          projectState: "Project state",
        },
        noLinkedProject: "No linked project",
        projectNotes: "Project notes",
        filesAndReferences: "Files and references",
        downloadTechnicalDrawing: "Download technical drawing",
        download3dModel: "Download 3D model",
        downloadMiscFile: "Download misc file {{index}}",
        downloadAttachment: "Download attachment {{index}}",
        downloadPhoto: "Download photo {{index}}",
        showPreview: "Show preview",
        hidePreview: "Hide preview",
        technicalDrawingPreview: "Technical drawing preview",
        projectState: {
          active: "Active",
          completed: "Completed",
        },
        addMember: "Add member",
        newProject: "New project",
        newTask: "New task",
      },
      logs: {
        headers: {
          time: "Time",
          entity: "Entity",
          action: "Action",
          field: "Field",
          message: "Message",
          actor: "Actor",
        },
        messages: {
          projectMarkedCompleted: "Project marked completed",
          projectReopened: "Project reopened",
          taskAssignedTo: "Task assigned to {{name}}",
          taskUnassigned: "Task unassigned",
          taskStatusChanged: "Task status changed from {{from}} to {{to}}",
        },
      },
      toasts: {
        employeeUpdated: "Employee updated",
        projectUpdated: "Project updated",
        employeeCreated: "Employee created",
        projectCreated: "Project created",
        taskCreated: "Task created",
        taskUpdated: "Task updated",
      },
      errors: {
        somethingWentWrong: "Something went wrong.",
        incorrectCredentials: "Incorrect credentials",
        technicalDrawingRequired:
          "A readable technical drawing PDF is required to create a project",
        projectNotFound: "Project not found",
        taskNotFound: "Task not found",
        assigneeNotFound: "Assignee not found",
        parentProjectNotFound: "Parent project not found",
        employeeNotFound: "Employee not found",
        usernameAlreadyExists: "Username already exists",
        notAllowedModifyProject: "Not allowed to modify this project",
        notAllowedViewTask: "Not allowed to view this task",
        notAllowedModifyTask: "Not allowed to modify this task",
        networkError: "Network error",
      },
    },
  },
  "ru-RU": {
    translation: {
      common: {
        appearance: "Внешний вид",
        toggleTheme: "Переключить тему",
        theme: { light: "Светлая", dark: "Тёмная", system: "Системная" },
        language: "Язык",
        english: "Английский",
        russian: "Русский",
        turkmen: "Туркменский",
        turkish: "Турецкий",
        uzbek: "Узбекский",
        arabic: "Арабский",
        actions: "Действия",
        status: "Статус",
        role: "Роль",
        email: "Эл. почта",
        employee: "Сотрудник",
        name: "Имя",
        title: "Название",
        username: "Имя пользователя",
        password: "Пароль",
        notes: "Заметки",
        save: "Сохранить",
        create: "Создать",
        edit: "Редактировать",
        close: "Закрыть",
        loading: "Загрузка…",
        saving: "Сохранение…",
        creating: "Создание…",
        uploading: "Загрузка…",
        active: "Активен",
        inactive: "Неактивен",
        completed: "Завершён",
        reset: "Сбросить",
        previous: "Назад",
        next: "Далее",
        page: "Страница",
        of: "из",
        rowsPerPage: "Строк на странице",
        noResultsFound: "Ничего не найдено.",
        show: "Показать",
        hide: "Скрыть",
        assignee: "Исполнитель",
        assigned: "Назначено",
        unassigned: "Не назначено",
        noDeadline: "Без срока",
        workspace: "Рабочее пространство",
        logout: "Выйти",
        project: "Проект",
        task: "Задача",
        sortBy: "Сортировать по",
        ascending: "По возрастанию",
        descending: "По убыванию",
        deadline: "Срок",
        urgency: "Срочность",
        complexity: "Сложность",
        entity: "Сущность",
        actor: "Исполнитель",
        field: "Поле",
        message: "Сообщение",
        system: "Система",
      },
    },
  },
  "tk-TM": {
    translation: {
      common: {
        appearance: "Daşky görnüş",
        toggleTheme: "Temany üýtget",
        theme: { light: "Açyk", dark: "Garaňky", system: "Ulgam" },
        language: "Dil",
        english: "Iňlis",
        russian: "Rus",
        turkmen: "Türkmen",
        turkish: "Türk",
        uzbek: "Özbek",
        arabic: "Arap",
        actions: "Hereketler",
        status: "Ýagdaý",
        role: "Roly",
        email: "E-poçta",
        employee: "Işgär",
        name: "Ady",
        title: "Ady",
        username: "Ulanyjy ady",
        password: "Parol",
        notes: "Bellikler",
        save: "Ýatda sakla",
        create: "Döret",
        edit: "Üýtget",
        close: "Ýap",
        loading: "Ýüklenýär…",
        saving: "Ýatda saklanýar…",
        creating: "Döredilýär…",
        uploading: "Ýüklenýär…",
        active: "Işjeň",
        inactive: "Işjeň däl",
        completed: "Tamamlanan",
        reset: "Täzeden başlat",
        previous: "Öňki",
        next: "Indiki",
        page: "Sahypa",
        of: "/",
        rowsPerPage: "Sahypadaky setirler",
        noResultsFound: "Netije tapylmady.",
        show: "Görkez",
        hide: "Gizle",
        assignee: "Jogapkär",
        assigned: "Bellenen",
        unassigned: "Belleilmän",
        noDeadline: "Möhlet ýok",
        workspace: "Iş meýdany",
        logout: "Çyk",
        project: "Taslama",
        task: "Ýumuş",
        sortBy: "Şu boýunça tertiple",
        ascending: "Artýan tertipde",
        descending: "Peselýän tertipde",
        deadline: "Möhlet",
        urgency: "Gyssaglylyk",
        complexity: "Çylşyrymlylyk",
        entity: "Obýekt",
        actor: "Ýerine ýetiriji",
        field: "Meýdan",
        message: "Habar",
        system: "Ulgam",
      },
    },
  },
  "tr-TR": {
    translation: {
      common: {
        appearance: "Görünüm",
        toggleTheme: "Temayı değiştir",
        theme: { light: "Açık", dark: "Koyu", system: "Sistem" },
        language: "Dil",
        english: "İngilizce",
        russian: "Rusça",
        turkmen: "Türkmence",
        turkish: "Türkçe",
        uzbek: "Özbekçe",
        arabic: "Arapça",
        actions: "İşlemler",
        status: "Durum",
        role: "Rol",
        email: "E-posta",
        employee: "Çalışan",
        name: "Ad",
        title: "Başlık",
        username: "Kullanıcı adı",
        password: "Parola",
        notes: "Notlar",
        save: "Kaydet",
        create: "Oluştur",
        edit: "Düzenle",
        close: "Kapat",
        loading: "Yükleniyor…",
        saving: "Kaydediliyor…",
        creating: "Oluşturuluyor…",
        uploading: "Yükleniyor…",
        active: "Aktif",
        inactive: "Pasif",
        completed: "Tamamlandı",
        reset: "Sıfırla",
        previous: "Önceki",
        next: "Sonraki",
        page: "Sayfa",
        of: "/",
        rowsPerPage: "Sayfa başına satır",
        noResultsFound: "Sonuç bulunamadı.",
        show: "Göster",
        hide: "Gizle",
        assignee: "Atanan kişi",
        assigned: "Atandı",
        unassigned: "Atanmadı",
        noDeadline: "Son tarih yok",
        workspace: "Çalışma alanı",
        logout: "Çıkış yap",
        project: "Proje",
        task: "Görev",
        sortBy: "Şuna göre sırala",
        ascending: "Artan",
        descending: "Azalan",
        deadline: "Son tarih",
        urgency: "Aciliyet",
        complexity: "Karmaşıklık",
        entity: "Varlık",
        actor: "Yapan",
        field: "Alan",
        message: "Mesaj",
        system: "Sistem",
      },
    },
  },
  "uz-UZ": {
    translation: {
      common: {
        appearance: "Ko‘rinish",
        toggleTheme: "Mavzuni almashtirish",
        theme: { light: "Yorug‘", dark: "Qorong‘i", system: "Tizim" },
        language: "Til",
        english: "Inglizcha",
        russian: "Ruscha",
        turkmen: "Turkmancha",
        turkish: "Turkcha",
        uzbek: "Oʻzbekcha",
        arabic: "Arabcha",
        actions: "Amallar",
        status: "Holat",
        role: "Rol",
        email: "Email",
        employee: "Xodim",
        name: "Nomi",
        title: "Sarlavha",
        username: "Foydalanuvchi nomi",
        password: "Parol",
        notes: "Izohlar",
        save: "Saqlash",
        create: "Yaratish",
        edit: "Tahrirlash",
        close: "Yopish",
        loading: "Yuklanmoqda…",
        saving: "Saqlanmoqda…",
        creating: "Yaratilmoqda…",
        uploading: "Yuklanmoqda…",
        active: "Faol",
        inactive: "Nofaol",
        completed: "Tugallangan",
        reset: "Qayta tiklash",
        previous: "Oldingi",
        next: "Keyingi",
        page: "Sahifa",
        of: "/",
        rowsPerPage: "Har sahifadagi qatorlar",
        noResultsFound: "Natija topilmadi.",
        show: "Ko‘rsatish",
        hide: "Yashirish",
        assignee: "Mas’ul",
        assigned: "Biriktirilgan",
        unassigned: "Biriktirilmagan",
        noDeadline: "Muddat yo‘q",
        workspace: "Ish maydoni",
        logout: "Chiqish",
        project: "Loyiha",
        task: "Vazifa",
        sortBy: "Shu bo‘yicha saralash",
        ascending: "O‘sish bo‘yicha",
        descending: "Kamayish bo‘yicha",
        deadline: "Muddat",
        urgency: "Shoshilinchlik",
        complexity: "Murakkablik",
        entity: "Obyekt",
        actor: "Bajargan",
        field: "Maydon",
        message: "Xabar",
        system: "Tizim",
      },
    },
  },
  "ar-AE": {
    translation: {
      common: {
        appearance: "المظهر",
        toggleTheme: "تبديل المظهر",
        theme: { light: "فاتح", dark: "داكن", system: "النظام" },
        language: "اللغة",
        english: "الإنجليزية",
        russian: "الروسية",
        turkmen: "التركمانية",
        turkish: "التركية",
        uzbek: "الأوزبكية",
        arabic: "العربية",
        actions: "الإجراءات",
        status: "الحالة",
        role: "الدور",
        email: "البريد الإلكتروني",
        employee: "الموظف",
        name: "الاسم",
        title: "العنوان",
        username: "اسم المستخدم",
        password: "كلمة المرور",
        notes: "الملاحظات",
        save: "حفظ",
        create: "إنشاء",
        edit: "تعديل",
        close: "إغلاق",
        loading: "جارٍ التحميل…",
        saving: "جارٍ الحفظ…",
        creating: "جارٍ الإنشاء…",
        uploading: "جارٍ الرفع…",
        active: "نشط",
        inactive: "غير نشط",
        completed: "مكتمل",
        reset: "إعادة ضبط",
        previous: "السابق",
        next: "التالي",
        page: "الصفحة",
        of: "من",
        rowsPerPage: "عدد الصفوف لكل صفحة",
        noResultsFound: "لم يتم العثور على نتائج.",
        show: "إظهار",
        hide: "إخفاء",
        assignee: "المكلّف",
        assigned: "تم التعيين",
        unassigned: "غير معيّن",
        noDeadline: "لا يوجد موعد نهائي",
        workspace: "مساحة العمل",
        logout: "تسجيل الخروج",
        project: "المشروع",
        task: "المهمة",
        sortBy: "ترتيب حسب",
        ascending: "تصاعدي",
        descending: "تنازلي",
        deadline: "الموعد النهائي",
        urgency: "الأولوية",
        complexity: "التعقيد",
        entity: "الكيان",
        actor: "المنفّذ",
        field: "الحقل",
        message: "الرسالة",
        system: "النظام",
      },
    },
  },
} as const

const ADDITIONAL_TRANSLATIONS: Record<Exclude<AppLocale, "en-US">, Record<string, unknown>> = {
  "ru-RU": {
    common: {
      actions: "Действия",
      status: "Статус",
      role: "Роль",
      name: "Имя",
      title: "Название",
      username: "Имя пользователя",
      password: "Пароль",
      notes: "Заметки",
      save: "Сохранить",
      create: "Создать",
      edit: "Редактировать",
      close: "Закрыть",
      loading: "Загрузка…",
      saving: "Сохранение…",
      creating: "Создание…",
      uploading: "Загрузка…",
      active: "Активен",
      inactive: "Неактивен",
      completed: "Завершён",
      reset: "Сбросить",
      previous: "Назад",
      next: "Далее",
      page: "Страница",
      of: "из",
      rowsPerPage: "Строк на странице",
      noResultsFound: "Ничего не найдено.",
      show: "Показать",
      hide: "Скрыть",
      assignee: "Исполнитель",
      assigned: "Назначено",
      unassigned: "Не назначено",
      noDeadline: "Без срока",
      workspace: "Рабочее пространство",
      logout: "Выйти",
      project: "Проект",
      task: "Задача",
      sortBy: "Сортировать по",
      ascending: "По возрастанию",
      descending: "По убыванию",
      deadline: "Срок",
      urgency: "Срочность",
      complexity: "Сложность",
      entity: "Сущность",
      actor: "Исполнитель",
      field: "Поле",
      message: "Сообщение",
      system: "Система",
    },
    auth: {
      metaTitle: "CabinetryFlow – Вход",
      signInTitle: "Войти в CabinetryFlow",
      description:
        "Введите имя пользователя и пароль, чтобы получить доступ к рабочему пространству.",
      continue: "Продолжить",
      roleHint:
        "",
    },
    errorPage: {
      title: "Ошибка",
      heading: "Упс!",
      description: "Что-то пошло не так. Попробуйте ещё раз.",
      goHome: "На главную",
    },
    notFoundPage: {
      heading: "Упс!",
      description: "Страница, которую вы ищете, не найдена.",
      goBack: "Назад",
    },
    footer: { template: "CabinetryFlow · {{year}}" },
    dataTable: {
      showingRange: "Показано с {{start}} по {{end}} из {{total}} записей",
      pageOf: "Страница {{page}} из {{total}}",
      goToFirstPage: "Перейти на первую страницу",
      goToPreviousPage: "Перейти на предыдущую страницу",
      goToNextPage: "Перейти на следующую страницу",
      goToLastPage: "Перейти на последнюю страницу",
    },
    pdfViewer: {
      previewTechnicalDrawing: "Предпросмотр технического чертежа",
      pageIndicator: "Страница {{page}}",
      pageIndicatorWithTotal: "Страница {{page}} из {{total}}",
      zoomOut: "Уменьшить",
      zoomIn: "Увеличить",
      openFullPdf: "Открыть полный PDF",
      technicalDrawingPreview: "Предпросмотр технического чертежа",
    },
    sidebar: {
      title: "Боковая панель",
      mobileDescription: "Показывает мобильную боковую панель.",
      collapse: "Свернуть боковую панель",
      open: "Открыть боковую панель",
      toggle: "Переключить боковую панель",
    },
    passwordInput: { hide: "Скрыть пароль", show: "Показать пароль" },
    pagination: {
      ariaLabel: "Пагинация",
      goToPreviousPage: "Перейти на предыдущую страницу",
      previous: "Назад",
      goToNextPage: "Перейти на следующую страницу",
      next: "Далее",
      morePages: "Ещё страницы",
    },
    domain: {
      designations: {
        admin: "Администратор",
        seniorCarpenter: "Старший плотник",
        middleCarpenter: "Плотник среднего уровня",
        juniorCarpenter: "Младший плотник",
        painter: "Маляр",
        cncMachinist: "Оператор ЧПУ",
      },
      taskType: {
        cutting: "Резка",
        assembly: "Сборка",
        disassembly: "Разборка",
        finishing: "Отделка",
        other: "Другое",
      },
      taskStatus: {
        posted: "Размещено",
        inProgress: "В работе",
        waitingForApproval: "Ожидает подтверждения",
        waitingForSupply: "Ожидает поставки",
        completed: "Завершено",
      },
      urgency: {
        extremelyUrgent: "Крайне срочно",
        urgent: "Срочно",
        normal: "Обычная",
        low: "Низкая",
      },
      complexity: { simple: "Простая", normal: "Обычная", complex: "Сложная" },
      logEntity: { project: "Проект", task: "Задача" },
      logAction: { statusUpdated: "Статус обновлён", taskAssigned: "Задача назначена" },
      fields: { completed: "Завершено", status: "Статус", assignee: "Исполнитель" },
    },
    app: {
      metaTitle: "CabinetryFlow – Рабочее пространство",
      tabs: { tasks: "Задачи", projects: "Проекты", team: "Команда", logs: "Журналы", myTasks: "Мои задачи" },
      allTasks: "Все задачи",
      projectsHeading: "Проекты",
      teamHeading: "Команда",
      activityLogs: "Журнал активности",
      myTasksHint: "",
      sortTasksHint: "Сортируйте видимые задачи по сроку, типу или исполнителю.",
      sortField: { deadline: "Срок", taskType: "Тип задачи", assignee: "Исполнитель" },
      loading: { logs: "Загрузка журнала…", team: "Загрузка команды…", projects: "Загрузка проектов…", tasks: "Загрузка задач…" },
      empty: { employees: "Сотрудников пока нет.", projects: "Проектов пока нет.", tasks: "Задач пока нет." },
      dialogs: {
        editEmployeeTitle: "Редактировать сотрудника",
        editEmployeeDescription: "Обновите карточку сотрудника и статус активности.",
        editProjectTitle: "Редактировать проект",
        editProjectDescription: "Обновите данные проекта.",
        newEmployeeTitle: "Новый сотрудник",
        newEmployeeDescription: "Создайте нового участника команды. Позже вы сможете изменить его данные.",
        newProjectTitle: "Новый проект",
        newProjectDescription: "Создайте проект для группировки связанных задач и чертежей.",
        newTaskTitle: "Новая задача",
        newTaskDescription: "Создайте задачу, привяжите её к проекту и при необходимости назначьте сотруднику.",
      },
      form: {
        leaveBlankKeepPassword: "Оставьте пустым, чтобы сохранить текущий пароль",
        employeeIsActive: "Сотрудник активен",
        projectCompleted: "Проект завершён",
        technicalDrawingUrl: "Ссылка на технический чертёж",
        threeDModelUrl: "Ссылка на 3D-модель",
        miscFileUrls: "Ссылки на дополнительные файлы",
        oneUrlPerLine: "Одна ссылка в строке",
        technicalDrawingPdf: "Технический чертёж (PDF)",
        technicalDrawingUploadHint: "Вы также можете вставить ссылку вместо загрузки файла.",
        existingPdfLinkPlaceholder: "Или вставьте ссылку на PDF",
        threeDModel: "3D-модель",
        threeDModelUploadHint: "Вы также можете вставить ссылку на существующую модель.",
        existing3dModelLinkPlaceholder: "Или вставьте ссылку на 3D-модель",
        miscFiles: "Дополнительные файлы",
        attachments: "Вложения",
        photosCameraFriendly: "Фотографии",
        filesSelected_one: "Выбран {{count}} файл",
        filesSelected_other: "Выбрано {{count}} файлов",
        photosSelected_one: "Выбрана {{count}} фотография",
        photosSelected_other: "Выбрано {{count}} фотографий",
        selectProject: "Выберите проект",
        assigneeOptional: "Исполнитель (необязательно)",
      },
      deadlineHelp: "Время необязательно, по умолчанию используется 17:00.",
      meta: { project: "Проект", assignedTo: "Назначено", deadline: "Срок", urgency: "Срочность", status: "Статус", taskType: "Тип задачи", complexity: "Сложность", projectState: "Состояние проекта" },
      noLinkedProject: "Нет связанного проекта",
      projectNotes: "Заметки по проекту",
      filesAndReferences: "Файлы и ссылки",
      downloadTechnicalDrawing: "Скачать технический чертёж",
      download3dModel: "Скачать 3D-модель",
      downloadMiscFile: "Скачать дополнительный файл {{index}}",
      downloadAttachment: "Скачать вложение {{index}}",
      downloadPhoto: "Скачать фото {{index}}",
      technicalDrawingPreview: "Предпросмотр технического чертежа",
      projectState: { active: "Активен", completed: "Завершён" },
      addMember: "Добавить участника",
      newProject: "Новый проект",
      newTask: "Новая задача",
    },
    logs: {
      headers: { time: "Время", entity: "Сущность", action: "Действие", field: "Поле", message: "Сообщение", actor: "Исполнитель" },
      messages: {
        projectMarkedCompleted: "Проект помечен как завершённый",
        projectReopened: "Проект снова открыт",
        taskAssignedTo: "Задача назначена {{name}}",
        taskUnassigned: "Назначение задачи снято",
        taskStatusChanged: "Статус задачи изменён с {{from}} на {{to}}",
      },
    },
    toasts: {
      employeeUpdated: "Сотрудник обновлён",
      projectUpdated: "Проект обновлён",
      employeeCreated: "Сотрудник создан",
      projectCreated: "Проект создан",
      taskCreated: "Задача создана",
      taskUpdated: "Задача обновлена",
    },
    errors: {
      somethingWentWrong: "Что-то пошло не так.",
      incorrectCredentials: "Неверные учётные данные",
      technicalDrawingRequired: "Для создания проекта требуется читаемый PDF технического чертежа",
      projectNotFound: "Проект не найден",
      taskNotFound: "Задача не найдена",
      assigneeNotFound: "Исполнитель не найден",
      parentProjectNotFound: "Родительский проект не найден",
      employeeNotFound: "Сотрудник не найден",
      usernameAlreadyExists: "Имя пользователя уже существует",
      notAllowedModifyProject: "Изменение этого проекта запрещено",
      notAllowedViewTask: "Просмотр этой задачи запрещён",
      notAllowedModifyTask: "Изменение этой задачи запрещено",
      networkError: "Ошибка сети",
    },
  },
  "tk-TM": {
    common: {
      actions: "Hereketler",
      status: "Ýagdaý",
      role: "Roly",
      name: "Ady",
      title: "Ady",
      username: "Ulanyjy ady",
      password: "Parol",
      notes: "Bellikler",
      save: "Ýatda sakla",
      create: "Döret",
      edit: "Üýtget",
      close: "Ýap",
      loading: "Ýüklenýär…",
      saving: "Ýatda saklanýar…",
      creating: "Döredilýär…",
      uploading: "Ýüklenýär…",
      active: "Işjeň",
      inactive: "Işjeň däl",
      completed: "Tamamlanan",
      reset: "Täzeden başlat",
      previous: "Öňki",
      next: "Indiki",
      page: "Sahypa",
      of: "/",
      rowsPerPage: "Sahypadaky setirler",
      noResultsFound: "Netije tapylmady.",
      show: "Görkez",
      hide: "Gizle",
      assignee: "Jogapkär",
      assigned: "Bellenen",
      unassigned: "Belleilmän",
      noDeadline: "Möhlet ýok",
      workspace: "Iş meýdany",
      logout: "Çyk",
      project: "Taslama",
      task: "Ýumuş",
      sortBy: "Şu boýunça tertiple",
      ascending: "Artýan tertipde",
      descending: "Peselýän tertipde",
      deadline: "Möhlet",
      urgency: "Gyssaglylyk",
      complexity: "Çylşyrymlylyk",
      entity: "Obýekt",
      actor: "Ýerine ýetiriji",
      field: "Meýdan",
      message: "Habar",
      system: "Ulgam",
    },
    auth: { metaTitle: "CabinetryFlow – Giriş", signInTitle: "CabinetryFlow-a giriň", description: "Iş meýdanyňyza girmek üçin ulanyjy adyňyzy we parolyňyzy giriziň.", continue: "Dowam et", roleHint: "" },
    errorPage: { title: "Ýalňyşlyk", heading: "Wah!", description: "Bir zat nädogry boldy. Täzeden synanyşyň.", goHome: "Baş sahypa" },
    notFoundPage: { heading: "Wah!", description: "Gözleýän sahypaňyz tapylmady.", goBack: "Yza gaýt" },
    footer: { template: "CabinetryFlow · {{year}}" },
    dataTable: { showingRange: "{{total}} ýazgydan {{start}}–{{end}} görkezilýär", pageOf: "{{page}} / {{total}} sahypa", goToFirstPage: "Birinji sahypa geç", goToPreviousPage: "Öňki sahypa geç", goToNextPage: "Indiki sahypa geç", goToLastPage: "Soňky sahypa geç" },
    pdfViewer: { previewTechnicalDrawing: "Tehniki çyzgyny öňünden gör", pageIndicator: "{{page}}-nji sahypa", pageIndicatorWithTotal: "{{total}} sahypadan {{page}}-nji sahypa", zoomOut: "Kiçelt", zoomIn: "Ulalt", openFullPdf: "Doly PDF aç", technicalDrawingPreview: "Tehniki çyzgy syny" },
    sidebar: { title: "Gapdal panel", mobileDescription: "Mobil gapdal paneli görkezýär.", collapse: "Gapdal paneli ýygn", open: "Gapdal paneli aç", toggle: "Gapdal paneli üýtget" },
    passwordInput: { hide: "Paroly gizle", show: "Paroly görkez" },
    pagination: { ariaLabel: "Sahypalama", goToPreviousPage: "Öňki sahypa geç", previous: "Öňki", goToNextPage: "Indiki sahypa geç", next: "Indiki", morePages: "Has köp sahypa" },
    domain: { designations: { admin: "Administrator", seniorCarpenter: "Uly agaç ussasy", middleCarpenter: "Orta derejeli agaç ussasy", juniorCarpenter: "Kiçi agaç ussasy", painter: "Reňkleýji", cncMachinist: "CNC operatory" }, taskType: { cutting: "Kesmek", assembly: "Gurnama", disassembly: "Söküş", finishing: "Tamamlaýyş", other: "Beýleki" }, taskStatus: { posted: "Goýlan", inProgress: "Işde", waitingForApproval: "Tassyklamaga garaşýar", waitingForSupply: "Üpjünçilige garaşýar", completed: "Tamamlanan" }, urgency: { extremelyUrgent: "Örän gyssagly", urgent: "Gyssagly", normal: "Adaty", low: "Pes" }, complexity: { simple: "Ýönekeý", normal: "Adaty", complex: "Çylşyrymly" }, logEntity: { project: "Taslama", task: "Ýumuş" }, logAction: { statusUpdated: "Ýagdaý täzelendi", taskAssigned: "Ýumuş bellendi" }, fields: { completed: "Tamamlanan", status: "Ýagdaý", assignee: "Jogapkär" } },
    app: { metaTitle: "CabinetryFlow – Iş meýdany", tabs: { tasks: "Ýumuşlar", projects: "Taslamalar", team: "Topar", logs: "Žurnallar", myTasks: "Meniň ýumuşlarym" }, allTasks: "Ähli ýumuşlar", projectsHeading: "Taslamalar", teamHeading: "Topar", activityLogs: "Hereket žurnaly", myTasksHint: "", sortTasksHint: "Görünýän ýumuşlary möhlet, görnüş ýa-da jogapkär boýunça tertipläň.", sortField: { deadline: "Möhlet", taskType: "Ýumuş görnüşi", assignee: "Jogapkär" }, loading: { logs: "Žurnallar ýüklenýär…", team: "Topar ýüklenýär…", projects: "Taslamalar ýüklenýär…", tasks: "Ýumuşlar ýüklenýär…" }, empty: { employees: "Heniz işgär ýok.", projects: "Heniz taslama ýok.", tasks: "Heniz ýumuş ýok." }, dialogs: { editEmployeeTitle: "Işgäri üýtget", editEmployeeDescription: "Işgäriň maglumatlaryny we işjeň ýagdaýyny täzeläň.", editProjectTitle: "Taslamany üýtget", editProjectDescription: "Taslamanyň maglumatlaryny täzeläň.", newEmployeeTitle: "Täze işgär", newEmployeeDescription: "Täze topar agzasyny dörediň. Soň maglumatlaryny üýtgedip bilersiňiz.", newProjectTitle: "Täze taslama", newProjectDescription: "Degişli ýumuşlary we çyzgylary jemlemek üçin taslama dörediň.", newTaskTitle: "Täze ýumuş", newTaskDescription: "Ýumuş dörediň, taslama birikdiriň we isleseňiz işgäre belläň." }, form: { leaveBlankKeepPassword: "Häzirki paroly saklamak üçin boş goýuň", employeeIsActive: "Işgär işjeň", projectCompleted: "Taslama tamamlanan", technicalDrawingUrl: "Tehniki çyzgy salgysy", threeDModelUrl: "3D model salgysy", miscFileUrls: "Goşmaça faýl salgylar", oneUrlPerLine: "Her setirde bir salgı", technicalDrawingPdf: "Tehniki çyzgy (PDF)", technicalDrawingUploadHint: "Ýüklemegiň ýerine salgyny hem goýup bilersiňiz.", existingPdfLinkPlaceholder: "Ýa-da PDF salgysyny goýuň", threeDModel: "3D model", threeDModelUploadHint: "Bar bolan modele salgyny hem goýup bilersiňiz.", existing3dModelLinkPlaceholder: "Ýa-da 3D model salgysyny goýuň", miscFiles: "Goşmaça faýllar", attachments: "Goşundylar", photosCameraFriendly: "Suratlar", filesSelected_one: "{{count}} faýl saýlandy", filesSelected_other: "{{count}} faýl saýlandy", photosSelected_one: "{{count}} surat saýlandy", photosSelected_other: "{{count}} surat saýlandy", selectProject: "Taslamany saýlaň", assigneeOptional: "Jogapkär (islege görä)" }, deadlineHelp: "Wagt hökmany däl, deslapky wagtda 17:00 goýulýar.", meta: { project: "Taslama", assignedTo: "Bellenen", deadline: "Möhlet", urgency: "Gyssaglylyk", status: "Ýagdaý", taskType: "Ýumuş görnüşi", complexity: "Çylşyrymlylyk", projectState: "Taslama ýagdaýy" }, noLinkedProject: "Baglanyşykly taslama ýok", projectNotes: "Taslama bellikleri", filesAndReferences: "Faýllar we salgylanmalar", downloadTechnicalDrawing: "Tehniki çyzgyny ýükläp al", download3dModel: "3D modeli ýükläp al", downloadMiscFile: "Goşmaça faýly ýükläp al {{index}}", downloadAttachment: "Goşundyny ýükläp al {{index}}", downloadPhoto: "Suraty ýükläp al {{index}}", technicalDrawingPreview: "Tehniki çyzgy syny", projectState: { active: "Işjeň", completed: "Tamamlanan" }, addMember: "Agza goş", newProject: "Täze taslama", newTask: "Täze ýumuş" },
    logs: { headers: { time: "Wagt", entity: "Obýekt", action: "Hereket", field: "Meýdan", message: "Habar", actor: "Ýerine ýetiriji" }, messages: { projectMarkedCompleted: "Taslama tamamlanan diýip bellendi", projectReopened: "Taslama gaýtadan açyldy", taskAssignedTo: "Ýumuş {{name}} üçin bellendi", taskUnassigned: "Ýumuşdan bellik aýryldy", taskStatusChanged: "Ýumuşyň ýagdaýy {{from}} ýagdaýyndan {{to}} ýagdaýyna üýtgedi" } },
    toasts: { employeeUpdated: "Işgär täzelendi", projectUpdated: "Taslama täzelendi", employeeCreated: "Işgär döredildi", projectCreated: "Taslama döredildi", taskCreated: "Ýumuş döredildi", taskUpdated: "Ýumuş täzelendi" },
    errors: { somethingWentWrong: "Bir zat nädogry boldy.", incorrectCredentials: "Nädogry giriş maglumatlary", technicalDrawingRequired: "Taslama döretmek üçin okalýan tehniki çyzgy PDF-i gerek", projectNotFound: "Taslama tapylmady", taskNotFound: "Ýumuş tapylmady", assigneeNotFound: "Jogapkär tapylmady", parentProjectNotFound: "Ene taslama tapylmady", employeeNotFound: "Işgär tapylmady", usernameAlreadyExists: "Ulanyjy ady eýýäm bar", notAllowedModifyProject: "Bu taslamany üýtgetmäge rugsat ýok", notAllowedViewTask: "Bu ýumuşy görmäge rugsat ýok", notAllowedModifyTask: "Bu ýumuşy üýtgetmäge rugsat ýok", networkError: "Tor ýalňyşlygy" },
  },
  "tr-TR": {
    common: {
      actions: "İşlemler",
      status: "Durum",
      role: "Rol",
      name: "Ad",
      title: "Başlık",
      username: "Kullanıcı adı",
      password: "Parola",
      notes: "Notlar",
      save: "Kaydet",
      create: "Oluştur",
      edit: "Düzenle",
      close: "Kapat",
      loading: "Yükleniyor…",
      saving: "Kaydediliyor…",
      creating: "Oluşturuluyor…",
      uploading: "Yükleniyor…",
      active: "Aktif",
      inactive: "Pasif",
      completed: "Tamamlandı",
      reset: "Sıfırla",
      previous: "Önceki",
      next: "Sonraki",
      page: "Sayfa",
      of: "/",
      rowsPerPage: "Sayfa başına satır",
      noResultsFound: "Sonuç bulunamadı.",
      show: "Göster",
      hide: "Gizle",
      assignee: "Atanan kişi",
      assigned: "Atandı",
      unassigned: "Atanmadı",
      noDeadline: "Son tarih yok",
      workspace: "Çalışma alanı",
      logout: "Çıkış yap",
      project: "Proje",
      task: "Görev",
      sortBy: "Şuna göre sırala",
      ascending: "Artan",
      descending: "Azalan",
      deadline: "Son tarih",
      urgency: "Aciliyet",
      complexity: "Karmaşıklık",
      entity: "Varlık",
      actor: "Yapan",
      field: "Alan",
      message: "Mesaj",
      system: "Sistem",
    },
    auth: { metaTitle: "CabinetryFlow – Giriş", signInTitle: "CabinetryFlow’a giriş yapın", description: "Çalışma alanınıza erişmek için kullanıcı adınızı ve parolanızı girin.", continue: "Devam et", roleHint: "" },
    errorPage: { title: "Hata", heading: "Eyvah!", description: "Bir şeyler ters gitti. Lütfen tekrar deneyin.", goHome: "Ana sayfaya git" },
    notFoundPage: { heading: "Eyvah!", description: "Aradığınız sayfa bulunamadı.", goBack: "Geri dön" },
    footer: { template: "CabinetryFlow · {{year}}" },
    dataTable: { showingRange: "{{total}} kaydın {{start}}-{{end}} arası gösteriliyor", pageOf: "Sayfa {{page}} / {{total}}", goToFirstPage: "İlk sayfaya git", goToPreviousPage: "Önceki sayfaya git", goToNextPage: "Sonraki sayfaya git", goToLastPage: "Son sayfaya git" },
    pdfViewer: { previewTechnicalDrawing: "Teknik çizimi önizle", pageIndicator: "Sayfa {{page}}", pageIndicatorWithTotal: "Sayfa {{page}} / {{total}}", zoomOut: "Uzaklaştır", zoomIn: "Yakınlaştır", openFullPdf: "Tam PDF’i aç", technicalDrawingPreview: "Teknik çizim önizlemesi" },
    sidebar: { title: "Kenar çubuğu", mobileDescription: "Mobil kenar çubuğunu görüntüler.", collapse: "Kenar çubuğunu daralt", open: "Kenar çubuğunu aç", toggle: "Kenar çubuğunu değiştir" },
    passwordInput: { hide: "Parolayı gizle", show: "Parolayı göster" },
    pagination: { ariaLabel: "Sayfalama", goToPreviousPage: "Önceki sayfaya git", previous: "Önceki", goToNextPage: "Sonraki sayfaya git", next: "Sonraki", morePages: "Daha fazla sayfa" },
    domain: { designations: { admin: "Yönetici", seniorCarpenter: "Kıdemli marangoz", middleCarpenter: "Orta seviye marangoz", juniorCarpenter: "Genç marangoz", painter: "Boyacı", cncMachinist: "CNC operatörü" }, taskType: { cutting: "Kesim", assembly: "Montaj", disassembly: "Söküm", finishing: "Son işlem", other: "Diğer" }, taskStatus: { posted: "Yayınlandı", inProgress: "Devam ediyor", waitingForApproval: "Onay bekliyor", waitingForSupply: "Tedarik bekliyor", completed: "Tamamlandı" }, urgency: { extremelyUrgent: "Çok acil", urgent: "Acil", normal: "Normal", low: "Düşük" }, complexity: { simple: "Basit", normal: "Normal", complex: "Karmaşık" }, logEntity: { project: "Proje", task: "Görev" }, logAction: { statusUpdated: "Durum güncellendi", taskAssigned: "Görev atandı" }, fields: { completed: "Tamamlandı", status: "Durum", assignee: "Atanan" } },
    app: { metaTitle: "CabinetryFlow – Çalışma alanı", tabs: { tasks: "Görevler", projects: "Projeler", team: "Ekip", logs: "Kayıtlar", myTasks: "Görevlerim" }, allTasks: "Tüm görevler", projectsHeading: "Projeler", teamHeading: "Ekip", activityLogs: "Etkinlik kayıtları", myTasksHint: "", sortTasksHint: "Görünen görevleri son tarih, tür veya atanan kişiye göre sıralayın.", sortField: { deadline: "Son tarih", taskType: "Görev türü", assignee: "Atanan kişi" }, loading: { logs: "Kayıtlar yükleniyor…", team: "Ekip yükleniyor…", projects: "Projeler yükleniyor…", tasks: "Görevler yükleniyor…" }, empty: { employees: "Henüz çalışan yok.", projects: "Henüz proje yok.", tasks: "Henüz görev yok." }, dialogs: { editEmployeeTitle: "Çalışanı düzenle", editEmployeeDescription: "Çalışan kaydını ve aktiflik durumunu güncelleyin.", editProjectTitle: "Projeyi düzenle", editProjectDescription: "Proje ayrıntılarını güncelleyin.", newEmployeeTitle: "Yeni çalışan", newEmployeeDescription: "Yeni bir ekip üyesi oluşturun. Ayrıntılarını daha sonra güncelleyebilirsiniz.", newProjectTitle: "Yeni proje", newProjectDescription: "İlgili görevleri ve çizimleri gruplamak için bir proje oluşturun.", newTaskTitle: "Yeni görev", newTaskDescription: "Bir görev oluşturun, projeye bağlayın ve isterseniz bir çalışana atayın." }, form: { leaveBlankKeepPassword: "Mevcut parolayı korumak için boş bırakın", employeeIsActive: "Çalışan aktif", projectCompleted: "Proje tamamlandı", technicalDrawingUrl: "Teknik çizim bağlantısı", threeDModelUrl: "3D model bağlantısı", miscFileUrls: "Diğer dosya bağlantıları", oneUrlPerLine: "Her satıra bir bağlantı", technicalDrawingPdf: "Teknik çizim (PDF)", technicalDrawingUploadHint: "Yüklemek yerine bir bağlantı da yapıştırabilirsiniz.", existingPdfLinkPlaceholder: "Veya bir PDF bağlantısı yapıştırın", threeDModel: "3D model", threeDModelUploadHint: "Mevcut bir modele ait bağlantıyı da yapıştırabilirsiniz.", existing3dModelLinkPlaceholder: "Veya bir 3D model bağlantısı yapıştırın", miscFiles: "Diğer dosyalar", attachments: "Ekler", photosCameraFriendly: "Fotoğraflar", filesSelected_one: "{{count}} dosya seçildi", filesSelected_other: "{{count}} dosya seçildi", photosSelected_one: "{{count}} fotoğraf seçildi", photosSelected_other: "{{count}} fotoğraf seçildi", selectProject: "Proje seçin", assigneeOptional: "Atanan kişi (isteğe bağlı)" }, deadlineHelp: "Saat isteğe bağlıdır ve varsayılan olarak 17:00 olur.", meta: { project: "Proje", assignedTo: "Atanan", deadline: "Son tarih", urgency: "Aciliyet", status: "Durum", taskType: "Görev türü", complexity: "Karmaşıklık", projectState: "Proje durumu" }, noLinkedProject: "Bağlı proje yok", projectNotes: "Proje notları", filesAndReferences: "Dosyalar ve bağlantılar", downloadTechnicalDrawing: "Teknik çizimi indir", download3dModel: "3D modeli indir", downloadMiscFile: "Diğer dosyayı indir {{index}}", downloadAttachment: "Eki indir {{index}}", downloadPhoto: "Fotoğrafı indir {{index}}", technicalDrawingPreview: "Teknik çizim önizlemesi", projectState: { active: "Aktif", completed: "Tamamlandı" }, addMember: "Üye ekle", newProject: "Yeni proje", newTask: "Yeni görev" },
    logs: { headers: { time: "Saat", entity: "Varlık", action: "İşlem", field: "Alan", message: "Mesaj", actor: "Yapan" }, messages: { projectMarkedCompleted: "Proje tamamlandı olarak işaretlendi", projectReopened: "Proje yeniden açıldı", taskAssignedTo: "Görev {{name}} kişisine atandı", taskUnassigned: "Görev ataması kaldırıldı", taskStatusChanged: "Görev durumu {{from}} konumundan {{to}} konumuna değişti" } },
    toasts: { employeeUpdated: "Çalışan güncellendi", projectUpdated: "Proje güncellendi", employeeCreated: "Çalışan oluşturuldu", projectCreated: "Proje oluşturuldu", taskCreated: "Görev oluşturuldu", taskUpdated: "Görev güncellendi" },
    errors: { somethingWentWrong: "Bir şeyler ters gitti.", incorrectCredentials: "Kimlik bilgileri yanlış", technicalDrawingRequired: "Proje oluşturmak için okunabilir bir teknik çizim PDF’i gereklidir", projectNotFound: "Proje bulunamadı", taskNotFound: "Görev bulunamadı", assigneeNotFound: "Atanan kişi bulunamadı", parentProjectNotFound: "Üst proje bulunamadı", employeeNotFound: "Çalışan bulunamadı", usernameAlreadyExists: "Kullanıcı adı zaten mevcut", notAllowedModifyProject: "Bu projeyi değiştirmeye izin verilmiyor", notAllowedViewTask: "Bu görevi görüntülemeye izin verilmiyor", notAllowedModifyTask: "Bu görevi değiştirmeye izin verilmiyor", networkError: "Ağ hatası" },
  },
  "uz-UZ": {
    common: {
      actions: "Amallar",
      status: "Holat",
      role: "Rol",
      name: "Nomi",
      title: "Sarlavha",
      username: "Foydalanuvchi nomi",
      password: "Parol",
      notes: "Izohlar",
      save: "Saqlash",
      create: "Yaratish",
      edit: "Tahrirlash",
      close: "Yopish",
      loading: "Yuklanmoqda…",
      saving: "Saqlanmoqda…",
      creating: "Yaratilmoqda…",
      uploading: "Yuklanmoqda…",
      active: "Faol",
      inactive: "Nofaol",
      completed: "Tugallangan",
      reset: "Qayta tiklash",
      previous: "Oldingi",
      next: "Keyingi",
      page: "Sahifa",
      of: "/",
      rowsPerPage: "Har sahifadagi qatorlar",
      noResultsFound: "Natija topilmadi.",
      show: "Ko‘rsatish",
      hide: "Yashirish",
      assignee: "Mas’ul",
      assigned: "Biriktirilgan",
      unassigned: "Biriktirilmagan",
      noDeadline: "Muddat yo‘q",
      workspace: "Ish maydoni",
      logout: "Chiqish",
      project: "Loyiha",
      task: "Vazifa",
      sortBy: "Shu bo‘yicha saralash",
      ascending: "O‘sish bo‘yicha",
      descending: "Kamayish bo‘yicha",
      deadline: "Muddat",
      urgency: "Shoshilinchlik",
      complexity: "Murakkablik",
      entity: "Obyekt",
      actor: "Bajargan",
      field: "Maydon",
      message: "Xabar",
      system: "Tizim",
    },
    auth: { metaTitle: "CabinetryFlow – Kirish", signInTitle: "CabinetryFlow tizimiga kiring", description: "Ish maydoningizga kirish uchun foydalanuvchi nomi va parolingizni kiriting.", continue: "Davom etish", roleHint: "" },
    errorPage: { title: "Xatolik", heading: "Voy!", description: "Nimadir xato ketdi. Iltimos, qayta urinib ko‘ring.", goHome: "Bosh sahifaga qaytish" },
    notFoundPage: { heading: "Voy!", description: "Qidirayotgan sahifangiz topilmadi.", goBack: "Orqaga qaytish" },
    footer: { template: "CabinetryFlow · {{year}}" },
    dataTable: { showingRange: "{{total}} ta yozuvdan {{start}}–{{end}} ko‘rsatilmoqda", pageOf: "{{page}} / {{total}} sahifa", goToFirstPage: "Birinchi sahifaga o‘tish", goToPreviousPage: "Oldingi sahifaga o‘tish", goToNextPage: "Keyingi sahifaga o‘tish", goToLastPage: "Oxirgi sahifaga o‘tish" },
    pdfViewer: { previewTechnicalDrawing: "Texnik chizmani oldindan ko‘rish", pageIndicator: "{{page}}-sahifa", pageIndicatorWithTotal: "{{page}} / {{total}}", zoomOut: "Kichraytirish", zoomIn: "Kattalashtirish", openFullPdf: "To‘liq PDFni ochish", technicalDrawingPreview: "Texnik chizma ko‘rinishi" },
    sidebar: { title: "Yon panel", mobileDescription: "Mobil yon panelni ko‘rsatadi.", collapse: "Yon panelni yig‘ish", open: "Yon panelni ochish", toggle: "Yon panelni almashtirish" },
    passwordInput: { hide: "Parolni yashirish", show: "Parolni ko‘rsatish" },
    pagination: { ariaLabel: "Sahifalash", goToPreviousPage: "Oldingi sahifaga o‘tish", previous: "Oldingi", goToNextPage: "Keyingi sahifaga o‘tish", next: "Keyingi", morePages: "Ko‘proq sahifalar" },
    domain: { designations: { admin: "Administrator", seniorCarpenter: "Katta duradgor", middleCarpenter: "O‘rta darajadagi duradgor", juniorCarpenter: "Yosh duradgor", painter: "Bo‘yoqchi", cncMachinist: "CNC operatori" }, taskType: { cutting: "Kesish", assembly: "Yig‘ish", disassembly: "Ajratish", finishing: "Yakunlash", other: "Boshqa" }, taskStatus: { posted: "Joylangan", inProgress: "Jarayonda", waitingForApproval: "Tasdiq kutilmoqda", waitingForSupply: "Ta’minot kutilmoqda", completed: "Tugallangan" }, urgency: { extremelyUrgent: "Juda shoshilinch", urgent: "Shoshilinch", normal: "Oddiy", low: "Past" }, complexity: { simple: "Oddiy", normal: "Normal", complex: "Murakkab" }, logEntity: { project: "Loyiha", task: "Vazifa" }, logAction: { statusUpdated: "Holat yangilandi", taskAssigned: "Vazifa biriktirildi" }, fields: { completed: "Tugallangan", status: "Holat", assignee: "Mas’ul" } },
    app: { metaTitle: "CabinetryFlow – Ish maydoni", tabs: { tasks: "Vazifalar", projects: "Loyihalar", team: "Jamoa", logs: "Jurnallar", myTasks: "Mening vazifalarim" }, allTasks: "Barcha vazifalar", projectsHeading: "Loyihalar", teamHeading: "Jamoa", activityLogs: "Faoliyat jurnali", myTasksHint: "", sortTasksHint: "Ko‘rinib turgan vazifalarni muddat, tur yoki mas’ul bo‘yicha saralang.", sortField: { deadline: "Muddat", taskType: "Vazifa turi", assignee: "Mas’ul" }, loading: { logs: "Jurnallar yuklanmoqda…", team: "Jamoa yuklanmoqda…", projects: "Loyihalar yuklanmoqda…", tasks: "Vazifalar yuklanmoqda…" }, empty: { employees: "Hali xodimlar yo‘q.", projects: "Hali loyihalar yo‘q.", tasks: "Hali vazifalar yo‘q." }, dialogs: { editEmployeeTitle: "Xodimni tahrirlash", editEmployeeDescription: "Xodim ma’lumotlari va faol holatini yangilang.", editProjectTitle: "Loyihani tahrirlash", editProjectDescription: "Loyiha tafsilotlarini yangilang.", newEmployeeTitle: "Yangi xodim", newEmployeeDescription: "Yangi jamoa a’zosini yarating. Keyinroq uning ma’lumotlarini yangilashingiz mumkin.", newProjectTitle: "Yangi loyiha", newProjectDescription: "Tegishli vazifalar va chizmalarni guruhlash uchun loyiha yarating.", newTaskTitle: "Yangi vazifa", newTaskDescription: "Vazifa yarating, uni loyihaga biriktiring va xohlasangiz xodimga tayinlang." }, form: { leaveBlankKeepPassword: "Joriy parolni saqlash uchun bo‘sh qoldiring", employeeIsActive: "Xodim faol", projectCompleted: "Loyiha tugallangan", technicalDrawingUrl: "Texnik chizma havolasi", threeDModelUrl: "3D model havolasi", miscFileUrls: "Qo‘shimcha fayl havolalari", oneUrlPerLine: "Har qatorda bitta havola", technicalDrawingPdf: "Texnik chizma (PDF)", technicalDrawingUploadHint: "Yuklash o‘rniga havola ham qo‘yishingiz mumkin.", existingPdfLinkPlaceholder: "Yoki PDF havolasini qo‘ying", threeDModel: "3D model", threeDModelUploadHint: "Mavjud model havolasini ham qo‘yishingiz mumkin.", existing3dModelLinkPlaceholder: "Yoki 3D model havolasini qo‘ying", miscFiles: "Qo‘shimcha fayllar", attachments: "Biriktirmalar", photosCameraFriendly: "Rasmlar", filesSelected_one: "{{count}} ta fayl tanlandi", filesSelected_other: "{{count}} ta fayl tanlandi", photosSelected_one: "{{count}} ta rasm tanlandi", photosSelected_other: "{{count}} ta rasm tanlandi", selectProject: "Loyihani tanlang", assigneeOptional: "Mas’ul (ixtiyoriy)" }, deadlineHelp: "Vaqt ixtiyoriy, odatda 17:00 bo‘ladi.", meta: { project: "Loyiha", assignedTo: "Biriktirilgan", deadline: "Muddat", urgency: "Shoshilinchlik", status: "Holat", taskType: "Vazifa turi", complexity: "Murakkablik", projectState: "Loyiha holati" }, noLinkedProject: "Bog‘langan loyiha yo‘q", projectNotes: "Loyiha izohlari", filesAndReferences: "Fayllar va havolalar", downloadTechnicalDrawing: "Texnik chizmani yuklab olish", download3dModel: "3D modelni yuklab olish", downloadMiscFile: "Qo‘shimcha faylni yuklab olish {{index}}", downloadAttachment: "Biriktirmani yuklab olish {{index}}", downloadPhoto: "Rasmni yuklab olish {{index}}", technicalDrawingPreview: "Texnik chizma ko‘rinishi", projectState: { active: "Faol", completed: "Tugallangan" }, addMember: "A’zo qo‘shish", newProject: "Yangi loyiha", newTask: "Yangi vazifa" },
    logs: { headers: { time: "Vaqt", entity: "Obyekt", action: "Amal", field: "Maydon", message: "Xabar", actor: "Bajargan" }, messages: { projectMarkedCompleted: "Loyiha tugallangan deb belgilandi", projectReopened: "Loyiha qayta ochildi", taskAssignedTo: "Vazifa {{name}} ga biriktirildi", taskUnassigned: "Vazifa biriktirilmagan holatga qaytdi", taskStatusChanged: "Vazifa holati {{from}} dan {{to}} ga o‘zgardi" } },
    toasts: { employeeUpdated: "Xodim yangilandi", projectUpdated: "Loyiha yangilandi", employeeCreated: "Xodim yaratildi", projectCreated: "Loyiha yaratildi", taskCreated: "Vazifa yaratildi", taskUpdated: "Vazifa yangilandi" },
    errors: { somethingWentWrong: "Nimadir xato ketdi.", incorrectCredentials: "Login ma’lumotlari noto‘g‘ri", technicalDrawingRequired: "Loyiha yaratish uchun o‘qiladigan texnik chizma PDF fayli kerak", projectNotFound: "Loyiha topilmadi", taskNotFound: "Vazifa topilmadi", assigneeNotFound: "Mas’ul topilmadi", parentProjectNotFound: "Asosiy loyiha topilmadi", employeeNotFound: "Xodim topilmadi", usernameAlreadyExists: "Foydalanuvchi nomi allaqachon mavjud", notAllowedModifyProject: "Bu loyihani o‘zgartirishga ruxsat yo‘q", notAllowedViewTask: "Bu vazifani ko‘rishga ruxsat yo‘q", notAllowedModifyTask: "Bu vazifani o‘zgartirishga ruxsat yo‘q", networkError: "Tarmoq xatosi" },
  },
  "ar-AE": {
    common: {
      actions: "الإجراءات",
      status: "الحالة",
      role: "الدور",
      name: "الاسم",
      title: "العنوان",
      username: "اسم المستخدم",
      password: "كلمة المرور",
      notes: "الملاحظات",
      save: "حفظ",
      create: "إنشاء",
      edit: "تعديل",
      close: "إغلاق",
      loading: "جارٍ التحميل…",
      saving: "جارٍ الحفظ…",
      creating: "جارٍ الإنشاء…",
      uploading: "جارٍ الرفع…",
      active: "نشط",
      inactive: "غير نشط",
      completed: "مكتمل",
      reset: "إعادة ضبط",
      previous: "السابق",
      next: "التالي",
      page: "الصفحة",
      of: "من",
      rowsPerPage: "عدد الصفوف لكل صفحة",
      noResultsFound: "لم يتم العثور على نتائج.",
      show: "إظهار",
      hide: "إخفاء",
      assignee: "المكلّف",
      assigned: "تم التعيين",
      unassigned: "غير معيّن",
      noDeadline: "لا يوجد موعد نهائي",
      workspace: "مساحة العمل",
      logout: "تسجيل الخروج",
      project: "المشروع",
      task: "المهمة",
      sortBy: "ترتيب حسب",
      ascending: "تصاعدي",
      descending: "تنازلي",
      deadline: "الموعد النهائي",
      urgency: "الأولوية",
      complexity: "التعقيد",
      entity: "الكيان",
      actor: "المنفّذ",
      field: "الحقل",
      message: "الرسالة",
      system: "النظام",
    },
    auth: { metaTitle: "CabinetryFlow – تسجيل الدخول", signInTitle: "سجّل الدخول إلى CabinetryFlow", description: "أدخل اسم المستخدم وكلمة المرور للوصول إلى مساحة العمل الخاصة بك.", continue: "متابعة", roleHint: "" },
    errorPage: { title: "خطأ", heading: "عذرًا!", description: "حدث خطأ ما. يرجى المحاولة مرة أخرى.", goHome: "العودة إلى الرئيسية" },
    notFoundPage: { heading: "عذرًا!", description: "الصفحة التي تبحث عنها غير موجودة.", goBack: "الرجوع" },
    footer: { template: "CabinetryFlow · {{year}}" },
    dataTable: { showingRange: "عرض {{start}} إلى {{end}} من أصل {{total}} سجل", pageOf: "الصفحة {{page}} من {{total}}", goToFirstPage: "الانتقال إلى الصفحة الأولى", goToPreviousPage: "الانتقال إلى الصفحة السابقة", goToNextPage: "الانتقال إلى الصفحة التالية", goToLastPage: "الانتقال إلى الصفحة الأخيرة" },
    pdfViewer: { previewTechnicalDrawing: "معاينة الرسم الفني", pageIndicator: "الصفحة {{page}}", pageIndicatorWithTotal: "الصفحة {{page}} من {{total}}", zoomOut: "تصغير", zoomIn: "تكبير", openFullPdf: "فتح ملف PDF الكامل", technicalDrawingPreview: "معاينة الرسم الفني" },
    sidebar: { title: "الشريط الجانبي", mobileDescription: "يعرض الشريط الجانبي على الهاتف.", collapse: "طيّ الشريط الجانبي", open: "فتح الشريط الجانبي", toggle: "تبديل الشريط الجانبي" },
    passwordInput: { hide: "إخفاء كلمة المرور", show: "إظهار كلمة المرور" },
    pagination: { ariaLabel: "التنقل بين الصفحات", goToPreviousPage: "الانتقال إلى الصفحة السابقة", previous: "السابق", goToNextPage: "الانتقال إلى الصفحة التالية", next: "التالي", morePages: "المزيد من الصفحات" },
    domain: { designations: { admin: "مدير", seniorCarpenter: "نجار أول", middleCarpenter: "نجار متوسط", juniorCarpenter: "نجار مبتدئ", painter: "دهّان", cncMachinist: "مشغّل CNC" }, taskType: { cutting: "قص", assembly: "تجميع", disassembly: "تفكيك", finishing: "تشطيب", other: "أخرى" }, taskStatus: { posted: "منشورة", inProgress: "قيد التنفيذ", waitingForApproval: "بانتظار الموافقة", waitingForSupply: "بانتظار التوريد", completed: "مكتملة" }, urgency: { extremelyUrgent: "عاجلة جدًا", urgent: "عاجلة", normal: "عادية", low: "منخفضة" }, complexity: { simple: "بسيطة", normal: "عادية", complex: "معقدة" }, logEntity: { project: "مشروع", task: "مهمة" }, logAction: { statusUpdated: "تم تحديث الحالة", taskAssigned: "تم تعيين المهمة" }, fields: { completed: "مكتمل", status: "الحالة", assignee: "المكلّف" } },
    app: { metaTitle: "CabinetryFlow – مساحة العمل", tabs: { tasks: "المهام", projects: "المشاريع", team: "الفريق", logs: "السجلات", myTasks: "مهامي" }, allTasks: "كل المهام", projectsHeading: "المشاريع", teamHeading: "الفريق", activityLogs: "سجل النشاط", myTasksHint: "", sortTasksHint: "رتّب المهام الظاهرة حسب الموعد النهائي أو النوع أو الشخص المكلّف.", sortField: { deadline: "الموعد النهائي", taskType: "نوع المهمة", assignee: "المكلّف" }, loading: { logs: "جارٍ تحميل السجلات…", team: "جارٍ تحميل الفريق…", projects: "جارٍ تحميل المشاريع…", tasks: "جارٍ تحميل المهام…" }, empty: { employees: "لا يوجد موظفون بعد.", projects: "لا توجد مشاريع بعد.", tasks: "لا توجد مهام بعد." }, dialogs: { editEmployeeTitle: "تعديل الموظف", editEmployeeDescription: "حدّث سجل الموظف وحالته النشطة.", editProjectTitle: "تعديل المشروع", editProjectDescription: "حدّث تفاصيل المشروع.", newEmployeeTitle: "موظف جديد", newEmployeeDescription: "أنشئ عضوًا جديدًا في الفريق. يمكنك تحديث تفاصيله لاحقًا.", newProjectTitle: "مشروع جديد", newProjectDescription: "أنشئ مشروعًا لتجميع المهام والرسومات المرتبطة.", newTaskTitle: "مهمة جديدة", newTaskDescription: "أنشئ مهمة واربطها بمشروع ويمكنك أيضًا إسنادها إلى موظف." }, form: { leaveBlankKeepPassword: "اتركه فارغًا للاحتفاظ بكلمة المرور الحالية", employeeIsActive: "الموظف نشط", projectCompleted: "المشروع مكتمل", technicalDrawingUrl: "رابط الرسم الفني", threeDModelUrl: "رابط نموذج 3D", miscFileUrls: "روابط الملفات الإضافية", oneUrlPerLine: "رابط واحد في كل سطر", technicalDrawingPdf: "الرسم الفني (PDF)", technicalDrawingUploadHint: "يمكنك أيضًا لصق رابط بدلًا من الرفع.", existingPdfLinkPlaceholder: "أو الصق رابط PDF", threeDModel: "نموذج 3D", threeDModelUploadHint: "يمكنك أيضًا لصق رابط لنموذج موجود.", existing3dModelLinkPlaceholder: "أو الصق رابط نموذج 3D", miscFiles: "ملفات إضافية", attachments: "المرفقات", photosCameraFriendly: "الصور", filesSelected_one: "تم اختيار ملف واحد", filesSelected_other: "تم اختيار {{count}} ملفات", photosSelected_one: "تم اختيار صورة واحدة", photosSelected_other: "تم اختيار {{count}} صور", selectProject: "اختر مشروعًا", assigneeOptional: "المكلّف (اختياري)" }, deadlineHelp: "الوقت اختياري وسيكون افتراضيًا 5:00 مساءً.", meta: { project: "المشروع", assignedTo: "مكلّف إلى", deadline: "الموعد النهائي", urgency: "الأولوية", status: "الحالة", taskType: "نوع المهمة", complexity: "التعقيد", projectState: "حالة المشروع" }, noLinkedProject: "لا يوجد مشروع مرتبط", projectNotes: "ملاحظات المشروع", filesAndReferences: "الملفات والمراجع", downloadTechnicalDrawing: "تنزيل الرسم الفني", download3dModel: "تنزيل نموذج 3D", downloadMiscFile: "تنزيل ملف إضافي {{index}}", downloadAttachment: "تنزيل المرفق {{index}}", downloadPhoto: "تنزيل الصورة {{index}}", technicalDrawingPreview: "معاينة الرسم الفني", projectState: { active: "نشط", completed: "مكتمل" }, addMember: "إضافة عضو", newProject: "مشروع جديد", newTask: "مهمة جديدة" },
    logs: { headers: { time: "الوقت", entity: "الكيان", action: "الإجراء", field: "الحقل", message: "الرسالة", actor: "المنفّذ" }, messages: { projectMarkedCompleted: "تم وضع علامة مكتمل على المشروع", projectReopened: "أُعيد فتح المشروع", taskAssignedTo: "تم تعيين المهمة إلى {{name}}", taskUnassigned: "تم إلغاء تعيين المهمة", taskStatusChanged: "تغيّرت حالة المهمة من {{from}} إلى {{to}}" } },
    toasts: { employeeUpdated: "تم تحديث الموظف", projectUpdated: "تم تحديث المشروع", employeeCreated: "تم إنشاء الموظف", projectCreated: "تم إنشاء المشروع", taskCreated: "تم إنشاء المهمة", taskUpdated: "تم تحديث المهمة" },
    errors: { somethingWentWrong: "حدث خطأ ما.", incorrectCredentials: "بيانات الدخول غير صحيحة", technicalDrawingRequired: "يجب توفير ملف PDF مقروء للرسم الفني لإنشاء مشروع", projectNotFound: "المشروع غير موجود", taskNotFound: "المهمة غير موجودة", assigneeNotFound: "المكلّف غير موجود", parentProjectNotFound: "المشروع الرئيسي غير موجود", employeeNotFound: "الموظف غير موجود", usernameAlreadyExists: "اسم المستخدم موجود بالفعل", notAllowedModifyProject: "غير مسموح بتعديل هذا المشروع", notAllowedViewTask: "غير مسموح بعرض هذه المهمة", notAllowedModifyTask: "غير مسموح بتعديل هذه المهمة", networkError: "خطأ في الشبكة" },
  },
}

const translateFromMap = (
  value: string | null | undefined,
  map: Record<string, string>,
) => {
  const key = value ? map[value] : undefined
  return key ? i18n.t(key) : value ?? "—"
}

const DESIGNATION_KEY_MAP: Record<string, string> = {
  Admin: "domain.designations.admin",
  "Senior Carpenter": "domain.designations.seniorCarpenter",
  "Middle Carpenter": "domain.designations.middleCarpenter",
  "Junior Carpenter": "domain.designations.juniorCarpenter",
  Painter: "domain.designations.painter",
  "CNC Machinist": "domain.designations.cncMachinist",
}

const LANGUAGE_KEY_MAP: Record<string, string> = {
  EN: "common.english",
  RU: "common.russian",
  TK: "common.turkmen",
  TR: "common.turkish",
  UZ: "common.uzbek",
  AR: "common.arabic",
}

const URGENCY_KEY_MAP: Record<string, string> = {
  EXTREMELY_URGENT: "domain.urgency.extremelyUrgent",
  URGENT: "domain.urgency.urgent",
  NORMAL: "domain.urgency.normal",
  LOW: "domain.urgency.low",
}

const COMPLEXITY_KEY_MAP: Record<string, string> = {
  SIMPLE: "domain.complexity.simple",
  NORMAL: "domain.complexity.normal",
  COMPLEX: "domain.complexity.complex",
}

const TASK_TYPE_KEY_MAP: Record<string, string> = {
  CUTTING: "domain.taskType.cutting",
  ASSEMBLY: "domain.taskType.assembly",
  DISASSEMBLY: "domain.taskType.disassembly",
  FINISHING: "domain.taskType.finishing",
  OTHER: "domain.taskType.other",
}

const TASK_STATUS_KEY_MAP: Record<string, string> = {
  POSTED: "domain.taskStatus.posted",
  IN_PROGRESS: "domain.taskStatus.inProgress",
  WAITING_FOR_APPROVAL: "domain.taskStatus.waitingForApproval",
  WAITING_FOR_SUPPLY: "domain.taskStatus.waitingForSupply",
  COMPLETED: "domain.taskStatus.completed",
}

const LOG_ENTITY_KEY_MAP: Record<string, string> = {
  PROJECT: "domain.logEntity.project",
  TASK: "domain.logEntity.task",
}

const LOG_ACTION_KEY_MAP: Record<string, string> = {
  STATUS_UPDATED: "domain.logAction.statusUpdated",
  TASK_ASSIGNED: "domain.logAction.taskAssigned",
}

const FIELD_KEY_MAP: Record<string, string> = {
  completed: "domain.fields.completed",
  status: "domain.fields.status",
  assignee_id: "domain.fields.assignee",
}

const KNOWN_MESSAGE_KEY_MAP: Record<string, string> = {
  "Something went wrong.": "errors.somethingWentWrong",
  "Incorrect credentials": "errors.incorrectCredentials",
  "A readable technical drawing PDF is required to create a project": "errors.technicalDrawingRequired",
  "Project not found": "errors.projectNotFound",
  "Task not found": "errors.taskNotFound",
  "Assignee not found": "errors.assigneeNotFound",
  "Parent project not found": "errors.parentProjectNotFound",
  "Employee not found": "errors.employeeNotFound",
  "Username already exists": "errors.usernameAlreadyExists",
  "Not allowed to modify this project": "errors.notAllowedModifyProject",
  "Not allowed to view this task": "errors.notAllowedViewTask",
  "Not allowed to modify this task": "errors.notAllowedModifyTask",
  "Network Error": "errors.networkError",
  "Project marked completed": "logs.messages.projectMarkedCompleted",
  "Project reopened": "logs.messages.projectReopened",
  "Task unassigned": "logs.messages.taskUnassigned",
}

export const translateDesignation = (value?: string | null) =>
  translateFromMap(value, DESIGNATION_KEY_MAP)

export const translateLanguageCode = (value?: string | null) =>
  translateFromMap(value?.toUpperCase(), LANGUAGE_KEY_MAP)

export const translateUrgency = (value?: string | null) =>
  translateFromMap(value?.toUpperCase(), URGENCY_KEY_MAP)

export const translateComplexity = (value?: string | null) =>
  translateFromMap(value?.toUpperCase(), COMPLEXITY_KEY_MAP)

export const translateTaskType = (value?: string | null) =>
  translateFromMap(value?.toUpperCase(), TASK_TYPE_KEY_MAP)

export const translateTaskStatus = (value?: string | null) =>
  translateFromMap(value?.toUpperCase(), TASK_STATUS_KEY_MAP)

export const translateLogEntityType = (value?: string | null) =>
  translateFromMap(value?.toUpperCase(), LOG_ENTITY_KEY_MAP)

export const translateLogActionType = (value?: string | null) =>
  translateFromMap(value?.toUpperCase(), LOG_ACTION_KEY_MAP)

export const translateLogFieldName = (value?: string | null) =>
  translateFromMap(value, FIELD_KEY_MAP)

export const translateKnownMessage = (message?: string | null) => {
  if (!message?.trim()) return i18n.t("errors.somethingWentWrong")

  const key = KNOWN_MESSAGE_KEY_MAP[message.trim()]
  return key ? i18n.t(key) : message
}

export const translateLogMessage = ({
  action,
  message,
  oldValue,
  newValue,
}: {
  action?: string | null
  message?: string | null
  oldValue?: string | null
  newValue?: string | null
}) => {
  if (message === "Project marked completed" || message === "Project reopened") {
    return translateKnownMessage(message)
  }

  if ((action ?? "").toUpperCase() === "TASK_ASSIGNED") {
    if (!newValue) return i18n.t("logs.messages.taskUnassigned")

    const name = message?.match(/^Task assigned to (.+)$/)?.[1] ?? i18n.t("common.assignee")
    return i18n.t("logs.messages.taskAssignedTo", { name })
  }

  if (
    (action ?? "").toUpperCase() === "STATUS_UPDATED" &&
    oldValue &&
    newValue
  ) {
    return i18n.t("logs.messages.taskStatusChanged", {
      from: translateTaskStatus(oldValue),
      to: translateTaskStatus(newValue),
    })
  }

  return translateKnownMessage(message)
}

export const getStoredLocale = (): AppLocale | null => {
  if (typeof window === "undefined") return null
  return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY))
}

export const getInitialLocale = (): AppLocale => {
  if (typeof window === "undefined") return DEFAULT_LOCALE

  const saved = getStoredLocale()
  if (saved) return saved

  const browserLocales = [navigator.language, ...(navigator.languages ?? [])]
  for (const candidate of browserLocales) {
    const locale = normalizeLocale(candidate)
    if (locale) return locale
  }

  return DEFAULT_LOCALE
}

export const getCurrentLocale = (): AppLocale =>
  normalizeLocale(i18n.resolvedLanguage ?? i18n.language) ?? DEFAULT_LOCALE

export const syncLocaleWithEmployeeLanguage = async (language: string) => {
  const saved = getStoredLocale()
  if (saved) {
    await setAppLocale(saved)
    return
  }

  await setLocaleFromEmployeeLanguage(language)
}

export const setAppLocale = async (locale: AppLocale) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  }

  applyDocumentLocale(locale)
  await i18n.changeLanguage(locale)
}

export const setLocaleFromEmployeeLanguage = async (language: string) => {
  await setAppLocale(languageToLocale(language))
}

const initialLocale = getInitialLocale()

i18n.use(initReactI18next).init({
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...SUPPORTED_LOCALES],
  interpolation: { escapeValue: false },
  resources,
})

for (const [locale, bundle] of Object.entries(ADDITIONAL_TRANSLATIONS)) {
  i18n.addResourceBundle(locale, "translation", bundle, true, true)
}

applyDocumentLocale(initialLocale)

i18n.on("languageChanged", (language) => {
  applyDocumentLocale(normalizeLocale(language) ?? DEFAULT_LOCALE)
})

export default i18n
