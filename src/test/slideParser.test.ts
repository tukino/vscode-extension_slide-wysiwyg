import { parseSections, updateSection } from '../slideParser';

describe('slideParser', () => {
  const html = `
    <div class="reveal">
      <div class="slides">
        <section>page1</section>
        <section data-background="red">page2</section>
        <section>page3</section>
      </div>
    </div>
  `;

  it('parseSections: sectionを正しく配列化', () => {
    const sections = parseSections(html);
    expect(sections.length).toBe(3);
    expect(sections[0].html).toContain('page1');
    expect(sections[1].html).toContain('data-background="red"');
    expect(sections[2].html).toContain('page3');
  });

  it('parseSections: sectionが無い場合は空配列', () => {
    const noSectionHtml = '<div class="reveal"><div class="slides"></div></div>';
    const sections = parseSections(noSectionHtml);
    expect(sections.length).toBe(0);
  });

  it('updateSection: 指定indexのsectionのみ置換', () => {
    const updated = updateSection(html, 1, '<section>updated!</section>');
    expect(updated).toContain('page1');
    expect(updated).toContain('updated!');
    expect(updated).toContain('page3');
    expect(updated).not.toContain('data-background="red"');
  });

  it('updateSection: 範囲外indexは無視', () => {
    const updated = updateSection(html, 10, '<section>should not appear</section>');
    expect(updated).not.toContain('should not appear');
    expect(updated).toContain('page1');
    expect(updated).toContain('page2');
    expect(updated).toContain('page3');
  });
});
