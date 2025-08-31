import * as cheerio from 'cheerio';

export interface Section {
  index: number;
  html: string;
}

/**
 * .slide.html全体から .slides > section を抽出し配列化
 */
export function parseSections(html: string): Section[] {
  const $ = cheerio.load(html);
  const sections: Section[] = [];
  $('.reveal .slides > section').each((i: number, el: any) => {
    sections.push({
      index: i,
      html: $.html(el)
    });
  });
  return sections;
}

/**
 * 指定indexのsectionをcontentで置換し、全体HTMLを再構築
 */
export function updateSection(html: string, idx: number, content: string): string {
  const $ = cheerio.load(html);
  const sectionEls = $('.reveal .slides > section');
  if (sectionEls.length > idx) {
    sectionEls.eq(idx).replaceWith(content);
  }
  return $.html();
}
