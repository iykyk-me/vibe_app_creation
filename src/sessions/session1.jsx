// 1차시 단계별 콘텐츠 정의
export const SESSION1_STEPS = [
  {
    step: 0,
    title: '페르소나 뽑기',
    substeps: [
      {
        substep: 0,
        instruction: '지금부터 우리 동네 언남동에 사는 다양한 사람들을 만나볼 거예요. 아래 버튼을 눌러 나만의 페르소나를 뽑아보세요!',
        type: 'info',
      },
      {
        substep: 1,
        instruction: '버튼을 눌러 페르소나를 배정받으세요',
        type: 'draw_persona',
      },
    ]
  },
  {
    step: 1,
    title: '불편함 찾기',
    substeps: [
      {
        substep: 0,
        instruction: '내가 뽑은 페르소나가 언남동에서 겪을 불편함을 상상해보세요. 이 사람의 입장이 되어 생각해보세요!',
        type: 'info',
        showPersona: true,
      },
      {
        substep: 1,
        instruction: '이 사람이 겪을 불편함 첫 번째를 적어보세요',
        type: 'input',
        field: 'discomfort_1',
        placeholder: '예) 버스가 언제 오는지 몰라서 오래 기다렸다',
        showPersona: true,
      },
      {
        substep: 2,
        instruction: '이 사람이 겪을 불편함 두 번째를 적어보세요',
        type: 'input',
        field: 'discomfort_2',
        placeholder: '예) 근처 병원 정보를 찾기 어렵다',
        showPersona: true,
      },
      {
        substep: 3,
        instruction: '아래 프롬프트의 빈칸을 채워서 인공지능에 복사·붙여넣기 하세요',
        type: 'prompt_copy_ai',
        showPersona: true,
        promptTemplate: `너는 언남동에 사는 [  ]살 [  ]이야.
내가 찾은 불편함:
- [불편함 ①]
- [불편함 ②]
위 내용과 겹치지 않는 불편한 점 3가지를 더 찾아줘.`,
      },
    ]
  },
  {
    step: 2,
    title: 'AI 불편함 추가',
    substeps: [
      {
        substep: 0,
        instruction: '인공지능이 찾아준 불편함을 아래에 입력하세요',
        type: 'info',
        showPersona: true,
      },
      { substep: 1, instruction: 'AI가 찾은 불편함 ①', type: 'input', field: 'ai_discomfort_1', placeholder: '인공지능 답변에서 복사해서 붙여넣기', showPersona: true },
      { substep: 2, instruction: 'AI가 찾은 불편함 ②', type: 'input', field: 'ai_discomfort_2', placeholder: '인공지능 답변에서 복사해서 붙여넣기', showPersona: true },
      { substep: 3, instruction: 'AI가 찾은 불편함 ③', type: 'input', field: 'ai_discomfort_3', placeholder: '인공지능 답변에서 복사해서 붙여넣기', showPersona: true },
      {
        substep: 4,
        instruction: '아래 프롬프트의 빈칸을 채워서 인공지능에 복사·붙여넣기 하세요',
        type: 'prompt_copy_ai',
        showPersona: true,
        promptTemplate: `너는 [  ]야.
아래 불편함 중 스마트폰 앱으로 해결할 수 있는 것과
어려운 것을 구분하고 이유도 알려줘.
- [불편함 ①]
- [불편함 ②]
- 
- 
- `,
      },
    ]
  },
  {
    step: 3,
    title: '해결 가능 여부 검토',
    substeps: [
      {
        substep: 0,
        instruction: '인공지능 결과를 보고 앱으로 해결할 수 있는 불편함에 체크하세요',
        type: 'info',
      },
      {
        substep: 1,
        instruction: '아래 목록에서 앱으로 해결 가능한 것을 선택하세요',
        type: 'checkbox',
      },
    ]
  },
  {
    step: 4,
    title: '문제 선택',
    substeps: [
      {
        substep: 0,
        instruction: '체크한 불편함 중에서 앱으로 해결하고 싶은 문제 1개를 선택하세요',
        type: 'info',
      },
      {
        substep: 1,
        instruction: '해결할 문제 1개를 선택하세요',
        type: 'radio',
      },
      {
        substep: 2,
        instruction: '이 문제를 선택한 이유를 적어보세요',
        type: 'input',
        field: 'reason',
        placeholder: '왜 이 문제를 해결하고 싶나요?',
      },
    ]
  },
  {
    step: 5,
    title: '문제 공유',
    substeps: [
      {
        substep: 0,
        instruction: '선택한 문제를 패들렛에 공유하세요! 비슷한 문제를 선택한 친구와 팀이 될 거예요',
        type: 'info',
      },
      {
        substep: 1,
        instruction: '아래 내용을 복사해서 패들렛에 붙여넣기 하세요',
        type: 'share_copy',
      },
      {
        substep: 2,
        instruction: '패들렛에 접속해서 내 문제를 올리세요',
        type: 'paddlet_link',
      },
      {
        substep: 3,
        instruction: '오늘 수업 개발일지를 작성해주세요!',
        type: 'form_link',
        formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfMnCqSdQVVhUrIse7Ao3rVnF0aQSzmd2dAzX1qpWUG0Fl6Cw/viewform?usp=dialog',
      },
    ]
  },
]
