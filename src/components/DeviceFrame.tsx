/**
 * 자극물 화면을 감싸는 스마트폰 목업.
 *
 * 접속 기기와 무관하게 언제나 스마트폰이다. 실험물 목업이 스마트폰용만 있어
 * PC 용 화면을 따로 만들 자료가 없고, 만들 수 있더라도 참여자마다 다른 화면을 보면
 * 그 차이가 근거유형 효과에 섞인다. 실제 접속 기기는 participants.is_mobile 에
 * 그대로 남아 공변량으로 쓸 수 있다.
 *
 * 안쪽 화면(OttScreen)이 상태바까지 스스로 그리므로, 여기서는 얇은 베젤만 두른다.
 *
 * 크기는 창·기기·쓰이는 화면(자극물/순위)과 무관하게 언제나 같다 — .device-fit 이
 * 정한다. 창 높이에서 역산해 줄이던 것을 뺐다 (이유는 .device-fit 주석에).
 * 세로가 모자란 창에서는 목업을 줄이는 대신 담고 있는 칸이 스크롤된다.
 */
export default function DeviceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="device-fit rounded-[1.9rem] bg-neutral-900 p-[3px] shadow-xl ring-1 ring-white/10">
      <div className="overflow-hidden rounded-[1.75rem] bg-black">{children}</div>
    </div>
  );
}
