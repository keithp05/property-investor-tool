'use client';

import { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Building2, Loader2 } from 'lucide-react';

interface PlaidLinkButtonProps {
  propertyId: string;
  onSuccess: () => void;
}

export default function PlaidLinkButton({ propertyId, onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onPlaidSuccess = useCallback(async (publicToken: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicToken, propertyId }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Mortgage account linked successfully!');
        onSuccess();
      } else {
        alert('Failed to link account: ' + result.error);
      }
    } catch (error) {
      console.error('Exchange token error:', error);
      alert('Failed to link mortgage account');
    } finally {
      setLoading(false);
    }
  }, [propertyId, onSuccess]);

  const config = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
  };

  const { open, ready } = usePlaidLink(config);

  const handleClick = async () => {
    if (!linkToken) {
      // Create link token
      try {
        setLoading(true);
        const response = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId }),
        });

        const result = await response.json();

        if (result.success) {
          setLinkToken(result.linkToken);
          // Wait a moment for the link to initialize
          setTimeout(() => {
            open();
          }, 500);
        } else {
          alert('Failed to initialize Plaid: ' + result.error);
        }
      } catch (error) {
        console.error('Create link token error:', error);
        alert('Failed to initialize Plaid');
      } finally {
        setLoading(false);
      }
    } else {
      open();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading || (!ready && linkToken !== null)}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Building2 className="h-5 w-5" />
          Link Mortgage Account
        </>
      )}
    </button>
  );
}
