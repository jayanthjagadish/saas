import { CardElement } from '@stripe/react-stripe-js';

interface Props {
  onChange?: (event: any) => void;
}

export default function StripeCardElement({ onChange }: Props) {
  return (
    <div className="p-4 border rounded-md bg-white">
      <CardElement
        options={{
          style: {
            base: {
              color: '#111827',
              fontSize: '16px',
              '::placeholder': { color: '#9ca3af' },
            },
            invalid: { color: '#ef4444' },
          },
        }}
        onChange={onChange}
      />
    </div>
  );
}
