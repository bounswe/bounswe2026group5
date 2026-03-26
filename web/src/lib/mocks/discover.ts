// web/src/lib/mocks/discover.ts

// ---------------------------------------------------------------------------
// TYPES
// FUTURE: Move to a shared schema.ts or auto-generate from OpenAPI once the
//         backend (Django) is ready.
// ---------------------------------------------------------------------------

export interface DiscoverProfile {
  id: string
  name: string
  title: string
  /** URL of the profile picture. Fallback to initials avatar when undefined. */
  avatarUrl?: string
  skills: string[]
  bio: string
}

// ---------------------------------------------------------------------------
// MOCK DATA
// FUTURE: Replace with a real API call to GET /api/users/discover/
//         Add query params for search (q), pagination (page, pageSize),
//         and filtering (skill, role) when the backend endpoints are ready.
// ---------------------------------------------------------------------------

export const MOCK_DISCOVER_PROFILES: DiscoverProfile[] = [
  {
    id: 'dp1',
    name: 'Alex Sterling',
    title: 'Lead Data Scientist',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAiXwKmJP32D1nqOYAyKbx9mJ5zki9pbYtc6-HNApUqDZBqW-KQ_oDM3nAQdYNSopHIEGsEPqT1bZ2-PSDlnVmu5pigNiuvvbjSTQdEddW-A1La6SuIHdVVP--xKFn8UifJ1YkZet2JrMsURt6vQqjoONiHSDSWHHV-BKgibY8KnWeXU-sG0a3lhUJUWkNdm6ogU6GP1oWJBsvhmFtsB_k7SfIfAmt1pjKCA4DogyEFUKbFzBNnVm1DfyH0YZTV18hRCv-pgTB5djA',
    skills: ['Python', 'Machine Learning', 'TensorFlow'],
    bio: 'Architecting intelligent systems that bridge the gap between academic theory and scalable industry solutions.',
  },
  {
    id: 'dp2',
    name: 'Maya Patel',
    title: 'UX Researcher',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBBLpnDnp5AVcyPpzMwooDAupGWbMB68hYwGfj7aVMqEiFHFXgGp0J32wdCUDEJkyvnWAjSru-C6hU65iL1pfNyx6dDkAsr2-wUx4lXaV0FHa7iKxDfeBRUvFmXsnCr8L-uleb53Nc1PXzIzCFnfgjgaYog8ym4nLUDM5LS7ve1z211QaL4sKBZIuygJgwwG6eN7u1OiRdRfirriQLWzAjbBgDmKuwyipK4Nc1MvVGB6MMCGBCQAQhQTiyEguBeWE54YbzHiE1ixZY',
    skills: ['Figma', 'Ethnography', 'User Testing'],
    bio: 'Decoding human behavior to design digital experiences that feel intuitive, accessible, and meaningful.',
  },
  {
    id: 'dp3',
    name: 'Julian Thorne',
    title: 'Software Architect',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBVHEGLrBkJeHrJsrlUxQHtsGdkHF7DC6Laz44m5qZK1XHCfqPtRiTxu7vG_CXOfaXc4ZnG4Io3-ZxwC61dRDAdnxyKkR4gLo6ORVv0zc4og1MKvQ8d5BEc6EUmrUB_FRlWPqG5i2UgMX64NoJibBffIU2cbijp6EzU7lNDVRwRrjpQE1mDyZ1VYzcSmVNd-iBWSnrLxhvO-Jqm2-kc6SgnOQEuHhKmI1JRNmZWDhRBXm8lqRA0Hcb48Gl_VueOnMOHVPFIyEip0ZQ',
    skills: ['Go', 'Kubernetes', 'AWS'],
    bio: 'Building resilient, distributed cloud infrastructures for next-generation research platforms and big data.',
  },
  {
    id: 'dp4',
    name: 'Elena Rossi',
    title: 'Art Historian & Curator',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCpFvuy6mqN4Jv-nY7jpPEq3KJ21WxemOR9LyYnZkGUD3MJAaHKy7w7m6RJGyW2DP8MtsCu-rEUgd1Y7z79tuVlsStlm35NtNRHJy-OO3TZrsOUkf_UBMWF7GPsb5jn9DNdAZh4WII-6REUj3G7QGIkVyPceJjmFZYeqZb6L5THX2KUM-TwnYSeL7K54rLvkxzlks0JdBXJICK8aVWIRKtphRiNbh-Sa9On-t18rENdozh9b0A9AO62P6yKr8qGSQ7Z4K_F0bup4lY',
    skills: ['Curation', 'History', 'Archives'],
    bio: 'Preserving cultural heritage through digital archiving and multidisciplinary storytelling techniques.',
  },
  {
    id: 'dp5',
    name: 'Dr. Simon Kaan',
    title: 'Biomedical Engineer',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDAKcwHESerPdyQ-ER7A6RT6ple__85sVYRPDhR6D4LmGSC0efP2pwMuOVJoEPte0c_O6iFJyMw-V01gGBCn5kHQQvj_cHXGuT7iNPAZEOqVGNJVLEttwdzIV4N9Am1LnQm9aoGgXlLe9QaJ6P9utIqWQxRKmy9I_vZaBnBq0Zx4Maq9m9h8V0gINh1R2RnI7GmL8uzOoDXAgqxmyDVoNkoDACVlQ55pbgFmy4yJuq197eBIELIM7NuiQebkBvqGO4w7bTvp4ool8M',
    skills: ['MATLAB', 'Biomechanics', 'CAD'],
    bio: 'Investigating the intersection of mechanical engineering and biology to create advanced prosthetic technologies.',
  },
  {
    id: 'dp6',
    name: 'Chloe Vane',
    title: 'Creative Director',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCGrUpVHz9Q0rmVKTQJONGXTzPwH8as9HoH4gsisQ-BbbhxTlHzhtG0J-hfRg7ol6D-GQ0zysrtkI5q8C2aDpGWiZ1sHtkxOBkkbrr1Vybg7tfMQOF4iHQVEGwdx935jLljd-vcTM4YmWv15Hax77VmPu7-rs1f5eTAH3Q6VyB1-bfLCdCduYjOIU7tHVMyBAgC_PwRU-5flvkMl0sT93cEaCrfq2-v4gBtyliaPBxLgHtr_6AkrLjjPJppjYHDeTTaG9ypiHmEtfU',
    skills: ['Branding', 'Typography', 'Strategy'],
    bio: 'Translating complex editorial concepts into visual identities that resonate with a global, sophisticated audience.',
  },
  {
    id: 'dp7',
    name: 'Marcus Chen',
    title: 'Full Stack Developer',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCwLhdLuHdN0WP9STwsgHHyhaGPlkcHrHdlL4COlyvnVV6zfnEr2F31oRybK1o7U0W4vgZitLNqcHFSS7E6aFeP3qKzea9RNkZj9UuE5AuM0MkJiIjRlYYpusOIqHkSwxpiXOZJum7tRsPAYlLwEXo2XXEnQl0tTtey4mlOrWlE1pEfJHD9MQt1TYvwH6TS4whGaCeGbhBuAcddpzOrzMA1nLr93bk6x04kCUZWZawiDMYNKPeIS2Jnrlkr7G--WntbcfAPTOfB94c',
    skills: ['React', 'Node.js', 'PostgreSQL'],
    bio: 'Passionate about building fast, accessible web applications that empower researchers to share their findings seamlessly.',
  },
  {
    id: 'dp8',
    name: 'Sophie Laurent',
    title: 'Linguistics Professor',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBUDCeyl4OTbMcppI1FgCWJj-18vy6y_G1Ls-HHB_FCKalml04EBZ8XffMz69lJ2AZhsf1jwqg59psoTwUpG3ACnp9Wlue5cGcfbIgS6Vzr3HYhZdVs7ipjmtlb6q8Ds1osx3Wpyf7vAmJVQgL7tDv5eju-1KX7rYlOzW3qSu0U2xAKJ5zeBYikkHPVOHlcVDTiU--R94XjKwRG_-fH0A11k5BJ6PGUmWCZULFin3hoD9ua8fuQs7T5SLmabHhnqQace49tH1d4PVs',
    skills: ['Phonetics', 'NLP', 'AI Ethics'],
    bio: 'Analyzing the evolution of human language and its integration into modern artificial intelligence systems.',
  },
]
