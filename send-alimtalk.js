// netlify/functions/send-alimtalk.js
// 솔라피(SOLAPI) API로 카카오 알림톡을 발송합니다.
// API Key/Secret, 발신번호, 채널 ID(pfId), 템플릿 ID는 서버 쪽(Netlify 환경변수)에만 보관하고,
// 브라우저는 이 함수만 호출해서 수신번호 + 치환문구 값만 넘겨줍니다.

const crypto = require('crypto');

function buildAuthHeader(apiKey, apiSecret) {
  const dateTime = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(dateTime + salt)
    .digest('hex');
  return `HMAC-SHA256 apiKey=${apiKey}, date=${dateTime}, salt=${salt}, signature=${signature}`;
}

exports.handler = async function (event) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST 요청만 허용됩니다.' }) };
  }

  const API_KEY = process.env.SOLAPI_API_KEY;
  const API_SECRET = process.env.SOLAPI_API_SECRET;
  const SENDER = process.env.SOLAPI_SENDER_NUMBER; // 솔라피에 등록된 발신번호 (예: 0649007170)
  const PFID = process.env.SOLAPI_PFID;             // 카카오 비즈니스 채널 연동 ID
  const TEMPLATE_ID = process.env.SOLAPI_TEMPLATE_ID; // 승인받은 알림톡 템플릿 ID

  if (!API_KEY || !API_SECRET || !SENDER || !PFID || !TEMPLATE_ID) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'SOLAPI 관련 환경변수가 설정되지 않았습니다. (SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_NUMBER, SOLAPI_PFID, SOLAPI_TEMPLATE_ID)' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: '잘못된 요청 본문입니다.' }) };
  }

  const { to, variables } = body;
  // to: 수신번호 (예: '01012345678', 하이픈 없이)
  // variables: 템플릿 치환문구 객체, 예: { "#{사업장명}": "세무법인 다우", "#{총액}": "50만원" }
  // ↑ 변수명은 카카오에 승인받은 템플릿의 치환문구와 정확히 일치해야 합니다.

  if (!to) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: '수신번호(to)가 없습니다.' }) };
  }

  const toDigits = String(to).replace(/[^0-9]/g, '');

  try {
    const res = await fetch('https://api.solapi.com/messages/v4/send-many/detail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: buildAuthHeader(API_KEY, API_SECRET)
      },
      body: JSON.stringify({
        messages: [
          {
            to: toDigits,
            from: SENDER,
            kakaoOptions: {
              pfId: PFID,
              templateId: TEMPLATE_ID,
              variables: variables || {}
            }
          }
        ]
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return { statusCode: res.status, headers, body: JSON.stringify({ error: '솔라피 발송 실패', detail: data }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, result: data }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: '서버 오류', detail: err.message }) };
  }
};
