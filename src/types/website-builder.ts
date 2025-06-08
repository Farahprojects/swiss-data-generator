
export interface Service {
  title: string;
  description: string;
  price: string;
  imageUrl?: string;
}

export interface CustomizationData {
  coachName?: string;
  profileImage?: string;
  tagline?: string;
  bio?: string;
  services?: Service[];
  buttonText?: string;
  themeColor?: string;
  fontFamily?: string;
  backgroundStyle?: string;
  headerImageUrl?: string;
  aboutImageUrl?: string;
}
