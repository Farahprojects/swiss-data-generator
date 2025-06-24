
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
  services?: Service[];
  buttonText?: string;
  themeColor?: string;
  fontFamily?: string;
  backgroundStyle?: string;
  headerImageUrl?: string;
  headerImageData?: ImageData;
  aboutImageUrl?: string;
  aboutImageData?: ImageData;
}
