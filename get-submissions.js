// netlify/functions/get-submissions.js
// 탈리 API 키를 서버 쪽(Netlify 환경변수)에만 보관하고,
// 브라우저는 이 함수만 호출해서 응답 목록을 안전하게 받아옵니다.

exports.handler = async function (event, context) {
  const TALLY_API_KEY = process.env.TALLY_API_KEY;
  const FORM_ID = 'q4qkq7'; // 탈리 신청서 ID (URL의 tally.so/r/ 뒤 부분)

  if (!TALLY_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'TALLY_API_KEY 환경변수가 설정되지 않았습니다.' })
    };
  }

  try {
    const res = await fetch(`https://api.tally.so/forms/${FORM_ID}/submissions?limit=30`, {
      headers: { Authorization: `Bearer ${TALLY_API_KEY}` }
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        statusCode: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: '탈리 API 응답 오류', detail: text })
      };
    }

    const data = await res.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
