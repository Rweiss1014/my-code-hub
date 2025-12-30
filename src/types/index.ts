export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  locationType: string;
  employmentType: string;
  salary?: string;
  category: string;
  description: string;
  postedAt: string;
  source: string;
  applyUrl?: string;
}

export interface Freelancer {
  id: string;
  name: string;
  title: string;
  location: string;
  remoteOk: boolean;
  experience: string;
  hourlyRate: string;
  specializations: string[];
  skills: string[];
  bio: string;
  availability: 'available' | 'limited' | 'unavailable';
  featured: boolean;
  linkedIn?: string;
  website?: string;
  portfolio?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  jobCount: number;
  icon?: string;
}
