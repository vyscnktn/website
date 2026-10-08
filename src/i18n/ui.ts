export const languages = {
  en: 'English',
  de: 'Deutsch',
  tr: 'Türkçe',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'en';

export const ui = {
  en: {
    // Navbar
    'nav.guides': 'Guides',
    'nav.projects': 'Projects',
    'nav.about': 'About Me',
    'nav.status': 'Open to Working Student & Internship Roles',
    'nav.subtitle': 'AI & Cloud Systems',

    // Hero
    'hero.badge': '🚀 AI Architecture & Cloud Systems',
    'hero.greeting': 'Hello, I am',
    'hero.name': 'Veysi Can Keten',
    'hero.bio': 'I build AI-powered tools, architect resilient cloud infrastructures, and publish production-grade technical guides.',
    'hero.ctaGuides': 'Explore Guides',
    'hero.ctaProjects': 'View Projects',
    'hero.focus': 'Focus:',

    // Sections
    'section.guidesTitle': 'Latest Guides & Resources',
    'section.guidesSubtitle': 'AI integrations, cloud systems, and architectural blueprints.',
    'section.projectsTitle': 'Open Source Projects',
    'section.projectsSubtitle': 'AI tools and system infrastructure projects I build and maintain.',
    'section.aboutTitle': 'About Me & Capabilities',
    'section.aboutSubtitle': 'Systems thinking, resilient architectures, and a passion for continuous learning.',

    // About Me
    'about.role': 'Computer Science Student & System Architect',
    'about.bio': "I am a Computer Science student currently seeking a Working Student or Internship position in Germany where I can contribute to IT infrastructure. Whether I am drawing out whiteboard architectures for Turing's Way, preparing for my AWS Cloud Practitioner certification, or training as a hybrid athlete for my upcoming Ironman 70.3, my core focus is building resilient systems.",
    'about.card1Title': 'AI & ML',
    'about.card1Desc': 'LLM tooling, audio pipelines, local RAG architectures, and PyTorch model training.',
    'about.card2Title': 'Cloud & DevOps',
    'about.card2Desc': 'AWS Cloud Practitioner preparation, Docker containerization, and distributed systems.',
    'about.card3Title': 'Hybrid Endurance',
    'about.card3Desc': 'Ironman 70.3 training blended with rigorous engineering discipline and mental toughness.',
    'about.location': 'Location: Germany',
    'about.github': 'GitHub Profile',
    'about.linkedin': 'LinkedIn Connection',

    // Buttons & Cards
    'btn.copyEmail': 'Copy Email',
    'btn.copied': 'Copied!',
    'toast.emailCopied': 'Email address copied to clipboard!',
    'card.readGuide': 'Read Guide',
    'card.inspectGithub': 'Inspect on GitHub',
    'card.liveDemo': 'Live Demo',
    'guide.back': 'Back to All Guides',

    // Footer
    'footer.bio': 'Computer Science student focusing on AI architectures, cloud systems, and open-source software solutions.',
    'footer.quickLinks': 'Quick Links',
    'footer.social': 'Connect & Follow',
    'footer.rights': 'All rights reserved.',
    'footer.builtWith': 'Built with Astro v5 & Tailwind CSS',
  },
  de: {
    // Navbar
    'nav.guides': 'Leitfäden',
    'nav.projects': 'Projekte',
    'nav.about': 'Über mich',
    'nav.status': 'Offen für Werkstudenten- & Praktikumsstellen',
    'nav.subtitle': 'KI & Cloud-Systeme',

    // Hero
    'hero.badge': '🚀 KI-Architektur & Cloud-Systeme',
    'hero.greeting': 'Hallo, ich bin',
    'hero.name': 'Veysi Can Keten',
    'hero.bio': 'Ich entwickle KI-gestützte Tools, entwerfe belastbare Cloud-Infrastrukturen und veröffentliche praxisorientierte technische Leitfäden.',
    'hero.ctaGuides': 'Leitfäden entdecken',
    'hero.ctaProjects': 'Projekte ansehen',
    'hero.focus': 'Fokus:',

    // Sections
    'section.guidesTitle': 'Neueste Leitfäden & Ressourcen',
    'section.guidesSubtitle': 'KI-Integrationen, Cloud-Systeme und Architektur-Blaupausen.',
    'section.projectsTitle': 'Open-Source-Projekte',
    'section.projectsSubtitle': 'KI-Tools und Systeminfrastruktur-Projekte, die ich entwickle und pflege.',
    'section.aboutTitle': 'Über mich & Kompetenzen',
    'section.aboutSubtitle': 'Systemisches Denken, robuste Architekturen und Leidenschaft für kontinuierliches Lernen.',

    // About Me
    'about.role': 'Informatikstudent & Systemarchitekt',
    'about.bio': 'Als Informatikstudent suche ich derzeit eine Werkstudenten- oder Praktikumsstelle in Deutschland, bei der ich zur IT-Infrastruktur und zu Cloud-Systemen beitragen kann. Ob Whiteboard-Architekturen für Turing’s Way, die Vorbereitung auf die AWS Cloud Practitioner-Zertifizierung oder das Training als Hybrid-Athlet für den Ironman 70.3 – mein zentraler Fokus liegt auf dem Aufbau widerstandsfähiger Systeme.',
    'about.card1Title': 'KI & Machine Learning',
    'about.card1Desc': 'LLM-Tooling, Audio-Pipelines, lokale RAG-Architekturen und Modelltraining mit PyTorch.',
    'about.card2Title': 'Cloud & DevOps',
    'about.card2Desc': 'AWS Cloud Practitioner-Vorbereitung, Docker-Containerisierung und verteilte Systeme.',
    'about.card3Title': 'Hybride Ausdauer',
    'about.card3Desc': 'Ironman 70.3-Training kombiniert mit hoher Ingenieursdisziplin und mentaler Stärke.',
    'about.location': 'Standort: Deutschland',
    'about.github': 'GitHub-Profil',
    'about.linkedin': 'LinkedIn-Profil',

    // Buttons & Cards
    'btn.copyEmail': 'E-Mail kopieren',
    'btn.copied': 'Kopiert!',
    'toast.emailCopied': 'E-Mail-Adresse in die Zwischenablage kopiert!',
    'card.readGuide': 'Leitfaden lesen',
    'card.inspectGithub': 'Auf GitHub ansehen',
    'card.liveDemo': 'Live-Demo',
    'guide.back': 'Zurück zu allen Leitfäden',

    // Footer
    'footer.bio': 'Informatikstudent mit Schwerpunkt auf KI-Architekturen, Cloud-Systemen und Open-Source-Softwarelösungen.',
    'footer.quickLinks': 'Schnellzugriff',
    'footer.social': 'Kontakt & Folgen',
    'footer.rights': 'Alle Rechte vorbehalten.',
    'footer.builtWith': 'Erstellt mit Astro v5 & Tailwind CSS',
  },
  tr: {
    // Navbar
    'nav.guides': 'Rehberler',
    'nav.projects': 'Projeler',
    'nav.about': 'Hakkımda',
    'nav.status': 'Staj / Çalışan Öğrenci Fırsatlarına Açık',
    'nav.subtitle': 'Yapay Zeka & Bulut Sistemleri',

    // Hero
    'hero.badge': '🚀 Yapay Zeka Mimarileri & Bulut Sistemleri',
    'hero.greeting': 'Merhaba, ben',
    'hero.name': 'Veysi Can Keten',
    'hero.bio': 'Yapay zeka araçları geliştiriyor, bulut altyapıları tasarlıyor ve üretim ortamına yönelik teknik rehberler yayınlıyorum.',
    'hero.ctaGuides': 'Rehberleri Keşfet',
    'hero.ctaProjects': 'Projeleri İncele',
    'hero.focus': 'Odak:',

    // Sections
    'section.guidesTitle': 'Son Rehberler & Kaynaklar',
    'section.guidesSubtitle': 'Yapay zeka entegrasyonları, bulut sistemleri ve teknik mimari kılavuzları.',
    'section.projectsTitle': 'Açık Kaynak Projeler',
    'section.projectsSubtitle': 'Geliştirdiğim yapay zeka araçları ve sistem altyapı projeleri.',
    'section.aboutTitle': 'Hakkımda & Yetkinlikler',
    'section.aboutSubtitle': 'Sistemik düşünce, dayanıklı mimariler ve sürekli öğrenim tutkusu.',

    // About Me
    'about.role': 'Bilgisayar Bilimleri Öğrencisi & Sistem Mimarı',
    'about.bio': "Almanya'da Bilgisayar Bilimleri eğitimime devam ederken, IT altyapısı ve bulut sistemleri süreçlerine katkı sağlayabileceğim Working Student veya Staj fırsatlarını değerlendiriyorum. Günlük rutinlerimde Turing's Way için akış mimarileri çizmekten, AWS Cloud Practitioner sertifikama hazırlanmaya ve Ironman 70.3 yarışım için hibrit bir sporcu olarak antrenman yapmaya kadar temel odağım dayanıklı sistemler inşa etmektir.",
    'about.card1Title': 'Yapay Zeka & ML',
    'about.card1Desc': 'LLM araçları, ses işleme hatları, lokal RAG mimarileri ve PyTorch ile model eğitimi.',
    'about.card2Title': 'Bulut & DevOps',
    'about.card2Desc': 'AWS Cloud Practitioner hazırlığı, Docker konteynerizasyon ve dağıtık sistem mimarileri.',
    'about.card3Title': 'Hibrit Disiplin',
    'about.card3Desc': 'Ironman 70.3 antrenmanları ve zihinsel dayanıklılıkla harmanlanmış mühendislik disiplini.',
    'about.location': 'Konum: Almanya',
    'about.github': 'GitHub Profilim',
    'about.linkedin': 'LinkedIn Bağlantım',

    // Buttons & Cards
    'btn.copyEmail': 'E-postayı Kopyala',
    'btn.copied': 'Kopyalandı!',
    'toast.emailCopied': 'E-posta adresi panoya kopyalandı!',
    'card.readGuide': 'Rehberi Oku',
    'card.inspectGithub': 'GitHub\'da İncele',
    'card.liveDemo': 'Canlı Demo',
    'guide.back': 'Tüm Rehberlere Dön',

    // Footer
    'footer.bio': 'Yapay zeka mimarileri, bulut bilişim sistemleri ve açık kaynak yazılım çözümleri üzerine çalışan Bilgisayar Bilimleri öğrencisi.',
    'footer.quickLinks': 'Hızlı Bağlantılar',
    'footer.social': 'Takip Et & İletişim',
    'footer.rights': 'Tüm hakları saklıdır.',
    'footer.builtWith': 'Astro v5 & Tailwind CSS ile geliştirildi',
  },
} as const;

export function useTranslations(lang: Lang) {
  return function t(key: keyof typeof ui[typeof defaultLang]): string {
    const langDict = ui[lang] as Record<string, string>;
    const defaultDict = ui[defaultLang] as Record<string, string>;
    return langDict[key] || defaultDict[key] || key;
  };
}

export function getCleanSlug(id: string): string {
  return id.replace(/-(en|de|tr)$/, '');
}
