import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Product } from '@prisma/client';
import { ScanReceiptResponseDto } from './dto/scan-receipt-response.dto';

type OpenAiReceiptItem = {
  name: string;
  quantity: number;
  unit: string;
  price: number;
};

type OpenAiReceiptResponse = {
  items: OpenAiReceiptItem[];
};

@Injectable()
export class OpenAiReceiptService {
  private readonly apiKey: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    this.apiKey = apiKey;
  }

  async scanReceipt(base64Image: string, availableProducts: Product[]) {
    const imageUrl = this.toDataUrl(base64Image);

    const prompt =
      'Проаналізуй чек і витягни список покупок. Для кожного продукту вкажи назву, кількість, одиницю виміру та ціну. Поверни JSON.';

    const parsed = await this.requestJson<OpenAiReceiptResponse>({
      prompt,
      imageUrl,
    });

    if (!parsed || !Array.isArray(parsed.items)) {
      throw new BadRequestException('OpenAI returned invalid receipt schema');
    }

    const items = parsed.items
      .filter(item => item && typeof item.name === 'string')
      .map(item => {
        const best = this.findBestProductMatch(item.name, availableProducts);
        const productId = best && best.score >= 0.55 ? best.product.id : null;

        return {
          productId,
          productName: item.name,
          quantity: Number.isFinite(item.quantity) ? item.quantity : 1,
          unit: typeof item.unit === 'string' ? item.unit : 'piece',
          price: Number.isFinite(item.price) ? item.price : 0,
          needsReview: productId == null,
        };
      });

    const response: ScanReceiptResponseDto = { items };
    return response;
  }

  private toDataUrl(image: string) {
    if (image.startsWith('data:image/')) {
      return image;
    }

    return `data:image/jpeg;base64,${image}`;
  }

  private async requestJson<T>(params: { prompt: string; imageUrl: string }) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a receipt parsing engine. Return only valid JSON with no markdown.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: params.prompt },
              {
                type: 'image_url',
                image_url: { url: params.imageUrl },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new InternalServerErrorException(
        `OpenAI API error: ${response.status} ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      error?: { message?: string };
    };

    if (payload.error?.message) {
      throw new InternalServerErrorException(payload.error.message);
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new BadRequestException('OpenAI returned empty response');
    }

    try {
      return JSON.parse(content) as T;
    } catch {
      throw new BadRequestException('OpenAI returned invalid JSON');
    }
  }

  private findBestProductMatch(name: string, products: Product[]) {
    const query = this.normalizeName(name);
    if (!query) {
      return null;
    }

    let best: { product: Product; score: number } | null = null;

    for (const product of products) {
      const candidate = this.normalizeName(product.name);
      const candidateEn = product.nameEn
        ? this.normalizeName(product.nameEn)
        : null;

      const score = Math.max(
        this.similarity(query, candidate),
        candidateEn ? this.similarity(query, candidateEn) : 0,
      );

      if (!best || score > best.score) {
        best = { product, score };
      }
    }

    return best;
  }

  private normalizeName(value: string) {
    return value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  }

  private similarity(a: string, b: string) {
    if (!a || !b) {
      return 0;
    }

    if (a === b) {
      return 1;
    }

    const aTokens = new Set(a.split(' ').filter(Boolean));
    const bTokens = new Set(b.split(' ').filter(Boolean));

    if (!aTokens.size || !bTokens.size) {
      return 0;
    }

    let intersection = 0;
    for (const token of aTokens) {
      if (bTokens.has(token)) {
        intersection += 1;
      }
    }

    const union = aTokens.size + bTokens.size - intersection;
    if (union === 0) {
      return 0;
    }

    return intersection / union;
  }
}
