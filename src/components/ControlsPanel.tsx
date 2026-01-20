// src/components/ControlsPanel.tsx

export const ControlsPanel = () => {
  return (
    <div className="panel">
      <h2>조작법</h2>
      <ul>
        <li>← → : 좌우 이동</li>
        <li>↓ : 한 칸 내리기</li>
        <li>↑ : 회전</li>
        <li>Space : 하드 드롭</li>
        <li>C : 홀드 (연속 사용 가능)</li>
        <li>ESC : 일시정지 / 재개</li>
      </ul>
    </div>
  );
};
