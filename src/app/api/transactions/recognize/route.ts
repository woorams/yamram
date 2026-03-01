import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { receiptRecognitionSchema } from '@/lib/validators';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const EXPENSE_CATEGORIES = [
  '식비', '교통비', '생활비', '주거비', '통신비', '의료비',
  '보험료', '교육비', '문화생활', '의류미용', '경조사',
  '반려동물', '저축투자', '기타지출',
];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { image, mimeType } = body as { image: string; mimeType: string };

  if (!image || !mimeType) {
    return NextResponse.json({ error: '이미지가 필요합니다' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: 'JPEG, PNG, WebP, GIF만 지원합니다' }, { status: 400 });
  }

  // Check base64 size (~75% of base64 = original size)
  const estimatedSize = Math.ceil(image.length * 0.75);
  if (estimatedSize > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: '이미지 크기는 5MB 이하여야 합니다' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data: image,
              },
            },
            {
              type: 'text',
              text: `이 영수증/결제 이미지를 분석해서 다음 정보를 JSON으로 반환해주세요.

반드시 아래 JSON 형식만 반환하세요 (다른 텍스트 없이):
{
  "amount": 숫자 또는 null,
  "date": "YYYY-MM-DD" 또는 null,
  "category_hint": "카테고리명" 또는 null,
  "memo": "상호명/내용" 또는 null,
  "confidence": "high" | "medium" | "low"
}

규칙:
- amount: 총 결제 금액 (숫자만, 원 단위)
- date: 결제 날짜 (YYYY-MM-DD 형식)
- category_hint: 다음 카테고리 중 가장 적합한 것: ${EXPENSE_CATEGORIES.join(', ')}
- memo: 상호명 또는 결제 내용 (200자 이내)
- confidence: 인식 확신도 (영수증이 선명하면 high, 일부만 보이면 medium, 불분명하면 low)
- 읽을 수 없는 필드는 null로 설정`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: '인식 결과를 받지 못했습니다' }, { status: 500 });
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = textBlock.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    const validated = receiptRecognitionSchema.safeParse(parsed);

    if (!validated.success) {
      return NextResponse.json({ error: '인식 결과 형식 오류' }, { status: 500 });
    }

    return NextResponse.json(validated.data);
  } catch (err) {
    console.error('Receipt recognition error:', err);
    return NextResponse.json({ error: '영수증 인식에 실패했습니다' }, { status: 500 });
  }
}
