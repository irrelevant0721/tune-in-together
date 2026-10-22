import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_CHAT_SONG_CARDS, sanitizeChatSongCard, sanitizeChatSongCards } from './chatSongCard.js';

const song = (overrides = {}) => ({
  id: '1901371647',
  source: 'netease',
  name: '测试歌曲',
  artist: '测试歌手',
  ...overrides,
});

test('接受合法歌曲并清洗字段长度', () => {
  const card = sanitizeChatSongCard(song({
    album: '专辑',
    duration: 215000.4,
    name: 'x'.repeat(300),
  }));
  assert.equal(card.source, 'netease');
  assert.equal(card.id, '1901371647');
  assert.equal(card.name.length, 100);
  assert.equal(card.album, '专辑');
  assert.equal(card.duration, 215000);
});

test('拒绝未知音源、非法 id 与空歌名', () => {
  assert.equal(sanitizeChatSongCard(song({ source: 'unknown' })), null);
  assert.equal(sanitizeChatSongCard(song({ id: '../../etc/passwd' })), null);
  assert.equal(sanitizeChatSongCard(song({ id: '' })), null);
  assert.equal(sanitizeChatSongCard(song({ name: '   ' })), null);
  assert.equal(sanitizeChatSongCard(song({ id: 'a b' })), null);
});

test('拒绝非对象输入并丢弃不可信封面/播放地址', () => {
  assert.equal(sanitizeChatSongCard(null), null);
  assert.equal(sanitizeChatSongCard('netease:1'), null);
  assert.equal(sanitizeChatSongCard([song()]), null);
  const card = sanitizeChatSongCard(song({ pic: 'http://169.254.169.254/', url: 'http://evil.test/x.mp3' }));
  assert.equal('pic' in card, false);
  assert.equal('url' in card, false);
});

test('缺少歌手时回落为未知歌手，无有效时长时不带 duration', () => {
  const card = sanitizeChatSongCard(song({ artist: '  ', duration: 0 }));
  assert.equal(card.artist, '未知歌手');
  assert.equal('duration' in card, false);
});

test('列表归一化：按音源+ID 去重并截断到上限', () => {
  assert.deepEqual(sanitizeChatSongCards([song(), song(), song({ source: 'tencent' })]).length, 2);

  const many = Array.from({ length: MAX_CHAT_SONG_CARDS + 3 }, (_, i) => song({ id: String(i + 1) }));
  const cards = sanitizeChatSongCards(many);
  assert.equal(cards.length, MAX_CHAT_SONG_CARDS);
  assert.deepEqual(cards.map((c) => c.id), many.slice(0, MAX_CHAT_SONG_CARDS).map((s) => s.id));
});

test('封面白名单：精确/带点子域放行，子串欺骗与非 https 拒绝', () => {
  const accepted = [
    'https://p6-luna.douyinpic.com/img/x.image',
    'https://p3-sign.douyinpic.com/img/x.image',
    'https://y.gtimg.cn/music/photo/x.jpg',
    'https://imge.kugou.com/x.jpg',
  ];
  for (const pic of accepted) {
    assert.equal(sanitizeChatSongCard(song({ pic }))?.pic, pic, `应接受 ${pic}`);
  }
  const rejected = [
    'https://douyin.attacker.example/track.gif',
    'https://evil-douyin.com/x.png',
    'https://a.douyin.com.evil.net/x.jpg',
    'https://douyinpic.com.attacker.net/x.jpg',
    'http://p2.music.126.net/x.jpg',
    'https://evil.test/x.jpg',
  ];
  for (const pic of rejected) {
    assert.equal('pic' in sanitizeChatSongCard(song({ pic })), false, `应拒绝 ${pic}`);
  }
});

test('列表归一化：过滤非法项、拒绝非数组并忽略空输入', () => {
  assert.deepEqual(sanitizeChatSongCards([null, { id: 'x' }, song({ id: 'a' })]).map((c) => c.id), ['a']);
  assert.deepEqual(sanitizeChatSongCards(song()), []);
  assert.deepEqual(sanitizeChatSongCards(null), []);
  assert.deepEqual(sanitizeChatSongCards([]), []);
  assert.deepEqual(sanitizeChatSongCards(undefined), []);
});