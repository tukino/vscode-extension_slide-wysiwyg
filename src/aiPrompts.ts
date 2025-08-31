// AIプロンプトテンプレート集
export interface AiPromptTemplate {
  label: string;
  description?: string;
  template: string;
}

export const aiPromptTemplates: AiPromptTemplate[] = [
  {
    label: 'HTMLをスライド化',
    description: '選択中のHTMLをスライド資料に変換するプロンプト',
    template: '以下のHTMLをスライド資料として構成してください。\n\n---\n\n{selection}\n\n---\nスライドの構成例: タイトル、要点、まとめ、など。'
  },
  {
    label: 'デザイン改善',
    description: '選択中のHTML/CSSのデザインを改善するプロンプト',
    template: '以下のHTML/CSSのデザインをより見やすく、現代的に改善してください。\n\n---\n\n{selection}\n\n---'
  },
  {
    label: '要約',
    description: '選択中テキストを要約するプロンプト',
    template: '以下の内容をスライド用に要約してください。\n\n---\n\n{selection}\n\n---'
  }
];
