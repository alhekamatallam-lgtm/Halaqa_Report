import React from 'react';
import { WhatsAppIcon } from './icons';

interface WhatsAppButtonProps {
    phoneNumber: string;
    studentName: string;
    defaultMessage?: string;
}

const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    
    // Remove all non-digit characters
    let digits = phone.replace(/\D/g, '');
    
    // If it starts with '05', remove the '0'
    if (digits.startsWith('05')) {
        digits = digits.substring(1);
    }
    
    // If it starts with '5' (and is the right length), prepend '966'
    if (digits.startsWith('5') && (digits.length === 9)) {
        return `966${digits}`;
    }
    
    // If it already has the country code, use it as is
    if (digits.startsWith('966') && digits.length === 12) {
        return digits;
    }
    
    // Fallback if formatting fails
    return '';
};


export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({ phoneNumber, studentName, defaultMessage }) => {
    const formattedPhone = formatPhoneNumber(phoneNumber);

    if (!formattedPhone) {
        return null; // Don't render if the phone number is invalid
    }

    const message = defaultMessage 
        ? defaultMessage.replace('[student name]', studentName)
        : `السلام عليكم ولي أمر الطالب/ ${studentName}، نود التواصل معكم بخصوص مستوى ابنكم في الحلقة.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click events
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <button
            onClick={handleClick}
            className="p-2 rounded-full text-green-600 bg-green-100 hover:bg-green-200 hover:text-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
            aria-label={`إرسال رسالة واتساب إلى ولي أمر ${studentName}`}
            title="إرسال رسالة واتساب"
        >
            <WhatsAppIcon className="w-5 h-5" />
        </button>
    );
};
