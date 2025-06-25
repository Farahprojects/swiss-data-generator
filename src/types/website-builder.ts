
export interface Service {
  title: string;
  description: string;
  price: string;
  imageUrl?: string;
  imageData?: ImageData;
}

export interface ImageData {
  url: string;
  filePath: string;
}

export interface CustomizationData {
  coachName?: string;
  profileImage?: string;
  profileImageData?: ImageData;
  tagline?: string;
  bio?: string;
  introTitle?: string;
  introAlignment?: 'left' | 'center' | 'right';
  introFontStyle?: string;
  introTextColor?: string;
  heroFontStyle?: string;
  heroTextColor?: string;
  heroAlignment?: 'left' | 'center' | 'right';
  services?: Service[];
  buttonText?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonFontFamily?: string;
  buttonStyle?: 'bordered' | 'borderless';
  themeColor?: string;
  fontFamily?: string;
  backgroundStyle?: string;
  headerImageUrl?: string;
  headerImageData?: ImageData;
  aboutImageUrl?: string;
  aboutImageData?: ImageData;
}
