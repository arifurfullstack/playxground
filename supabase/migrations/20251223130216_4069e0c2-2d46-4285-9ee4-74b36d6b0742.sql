-- Create payment requests table for manual bank transfers
CREATE TABLE public.payment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('wallet_topup', 'subscription')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  transaction_reference TEXT,
  bank_account_name TEXT,
  notes TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  creator_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment requests
CREATE POLICY "Users can view own payment requests"
ON public.payment_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create payment requests
CREATE POLICY "Users can create payment requests"
ON public.payment_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all payment requests
CREATE POLICY "Admins can view all payment requests"
ON public.payment_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update payment requests
CREATE POLICY "Admins can update payment requests"
ON public.payment_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_payment_requests_updated_at
  BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create bank_settings table for admin to configure bank details
CREATE TABLE public.bank_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  routing_number TEXT,
  swift_code TEXT,
  additional_info TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view active bank settings
CREATE POLICY "Anyone can view active bank settings"
ON public.bank_settings
FOR SELECT
USING (is_active = true);

-- Admins can manage bank settings
CREATE POLICY "Admins can insert bank settings"
ON public.bank_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bank settings"
ON public.bank_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bank settings"
ON public.bank_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_bank_settings_updated_at
  BEFORE UPDATE ON public.bank_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();