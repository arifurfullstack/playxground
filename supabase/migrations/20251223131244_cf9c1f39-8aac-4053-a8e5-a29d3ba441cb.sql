-- Create payment gateways table for admin configuration
CREATE TABLE public.payment_gateways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'stripe', 'paypal', 'bank_transfer'
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  display_name TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- Everyone can view active gateways
CREATE POLICY "Anyone can view active payment gateways"
ON public.payment_gateways
FOR SELECT
USING (is_active = true);

-- Only admins can manage gateways
CREATE POLICY "Admins can manage payment gateways"
ON public.payment_gateways
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_payment_gateways_updated_at
BEFORE UPDATE ON public.payment_gateways
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert default gateways
INSERT INTO public.payment_gateways (name, type, display_name, description, config, is_active) VALUES
('PayPal', 'paypal', 'PayPal', 'Pay securely with PayPal', '{"sandbox": true, "email": "paypal@example.com"}', true),
('Stripe', 'stripe', 'Credit/Debit Card', 'Pay with card via Stripe', '{"sandbox": true}', true),
('Bank Transfer', 'bank_transfer', 'Bank Transfer', 'Direct bank transfer', '{}', true);