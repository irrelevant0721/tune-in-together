import { useEffect } from 'react';

const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260629_032424_3c9c2a9d-807b-4482-80e6-dd6d9dfd4545.mp4';

export default function NotFoundPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = '404 - Page Not Found';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="relative h-screen overflow-hidden bg-black font-['Figtree'] text-white">
      <video src={VIDEO_URL} autoPlay muted playsInline loop preload="auto" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 z-[1] bg-black/10" />

      <section className="relative z-[2] mx-auto flex h-full w-full max-w-[1340px] flex-col justify-end px-[15px] max-[809px]:items-start max-[809px]:px-[18px]">
        <div className="flex items-end gap-12 pb-[60px] max-[809px]:flex-col max-[809px]:items-start max-[809px]:gap-8 max-[809px]:pb-11">
          <h1 className="reveal-up flex-[2] text-[200px] font-medium uppercase leading-[81%] tracking-[-6px] max-[1199px]:text-[129.6px] max-[809px]:text-[clamp(68px,21vw,80px)] max-[809px]:leading-[96px] max-[809px]:tracking-[-4.8px]">404</h1>
          <div className="reveal-right flex-1 pl-[50px] max-[809px]:max-w-[420px] max-[809px]:pl-0">
            <p className="text-base font-medium leading-6 tracking-[-0.16px]">你访问的页面可能已被移动或不存在。回到首页，继续和朋友一起听歌。</p>
            <a href="/" className="portfolio-cta mt-6 inline-flex border border-white px-5 py-3 text-sm font-medium">返回首页</a>
          </div>
        </div>
      </section>
    </main>
  );
}
