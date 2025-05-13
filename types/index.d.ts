interface UserAccount {
  x?: string;
  github?: string;
  speakerdeck?: string;
}

interface DateYearMonth {
  year: number;
  month: number;
}

interface User {
  name: string;
  full_name_ja?: string;
  full_name_en?: string;
  description?: string;
  avatar?: string;
  joined_at?: DateYearMonth;
  left_at?: DateYearMonth | null;
  tags: string[];
  accounts?: UserAccount;
  sources: string[];
}

interface ConfigYaml {
  users: User[];
  home?: {
    description?: string;
  };
}

declare module 'js-yaml' {
  function load(str: string): ConfigYaml;
}

declare module 'rss-parser' {
  interface Item {
    title: string;
    link: string;
    pubDate: string;
    contentSnippet: string;
    tags: string[];
    isDuringEmployment?: boolean;
  }
  interface ParsedFeed {
    items: Item[];
    title?: string;
  }
  class Parser {
    constructor();
    parseURL(url: string): Promise<ParsedFeed>;
  }
  export default Parser;
}