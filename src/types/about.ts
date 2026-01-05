export interface AboutContent {
  id: string;
  title: string;
  subtitle: string;
  founderName: string;
  founderTitle: string;
  personalStory: {
    paragraph1: string;
    paragraph2: string;
    paragraph3: string;
  };
  mission: string;
  vision: string;
  differentiators: {
    footballPeople: {
      title: string;
      description: string;
    };
    modernTechnology: {
      title: string;
      description: string;
    };
    communityFocused: {
      title: string;
      description: string;
    };
  };
  personalMessage: string;
  callToAction: {
    title: string;
    description: string;
    footer: string;
  };
  lastUpdated: string;
  updatedBy: string;
}

export const defaultAboutContent: AboutContent = {
  id: 'about-content-1',
  title: 'About The Grassroots Scout',
  subtitle: 'Scouting the perfect match in grassroots football',
  founderName: 'Chris Gill',
  founderTitle: 'Founder & Developer',
  personalStory: {
    paragraph1: 'The idea for The Grassroots Scout was born from my own frustration as a football enthusiast and, more importantly, as a father of two football-mad sons (and a dancing-mad daughter!). Having coached both of my sons\' teams in recent years, I experienced both sides of the grassroots football challenge - the endless search for the right players to complete a squad, and the equally frustrating hunt for suitable teams for talented young players.',
    paragraph2: 'As both a technology professional and someone who has lived and breathed grassroots football from every angle - parent, coach, and community member - I realised there had to be a better way. The traditional methods of finding teams or players - word of mouth, local notice boards, or scattered social media posts - simply weren\'t efficient enough for helping players find environments where they could truly flourish.',
    paragraph3: 'That\'s when I decided to combine my technical skills with my passion for football to create something that could make a real difference. The Grassroots Scout isn\'t just a platform - it\'s my contribution to ensuring every player can find their perfect match, where they\'ll be valued, developed, and able to enjoy their football to the fullest.'
  },
  mission: 'To bridge the gap between passionate football players and dedicated coaches by providing a centralised, user-friendly platform that makes connections simple, transparent, and effective. We believe everyone deserves the opportunity to find the right team environment where they can flourish and enjoy the beautiful game.',
  vision: 'To become the go-to platform for grassroots football connections across the UK, fostering a thriving community where talent is nurtured, players find their perfect match, and the love for football continues to grow through meaningful connections at every level.',
  differentiators: {
    footballPeople: {
      title: 'Built by Football People',
      description: 'Created by a father, coach, and technology professional who has experienced the real challenges faced by players, coaches, and parents in grassroots football.'
    },
    modernTechnology: {
      title: 'Modern Technology',
      description: 'Leveraging the latest web technologies to provide a seamless, mobile-friendly experience that works for everyone.'
    },
    communityFocused: {
      title: 'Community Focused',
      description: 'Every feature is designed with the grassroots football community in mind, focusing on helping players find environments where they can develop, enjoy their football, and reach their potential.'
    }
  },
  personalMessage: 'Football has always been more than just a game to me - it\'s about family, community, and bringing people together. As a father watching my sons chase their football dreams, and as a coach trying to find the right environments for young players to flourish, I\'ve seen the challenges from every perspective. Through The Grassroots Scout, I hope to give back to the sport and community that has given my family so much joy. Every connection made, every player finding their perfect match, and every success story shared makes this journey worthwhile.',
  callToAction: {
    title: 'Join Our Community',
    description: 'Whether you\'re a player looking for the right environment to develop your skills, a coach seeking players who fit your team\'s philosophy, or a parent supporting your child\'s football journey - you belong here.',
    footer: 'Welcome to The Grassroots Scout - where we scout your perfect match.'
  },
  lastUpdated: new Date().toISOString(),
  updatedBy: 'System'
};
