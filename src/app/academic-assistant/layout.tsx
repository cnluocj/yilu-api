import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI学术助手 - 医学论文大纲生成",
  description: "专业的医学硕博论文大纲生成工具，支持iframe嵌套",
  robots: "noindex, nofollow", // 防止搜索引擎索引iframe页面
};

export default function AcademicAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-full overflow-auto">
      {children}
    </div>
  );
}
