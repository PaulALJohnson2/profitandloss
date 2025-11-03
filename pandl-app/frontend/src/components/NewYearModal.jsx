import React, { useState } from 'react';
import { getNextFiscalYear, formatFiscalYearDisplay } from '../utils/fiscalYearUtils';
import { initializeNewFiscalYear } from '../firebase/firestoreService';

const NewYearModal = ({ currentYear, userId, onYearCreated, onClose }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const nextYear = getNextFiscalYear(currentYear);
  const nextYearDisplay = formatFiscalYearDisplay(nextYear);

  const handleCreateNewYear = async () => {
    setIsCreating(true);
    setError('');

    try {
      // Pass the current year so fixed costs can be copied from it
      await initializeNewFiscalYear(userId, nextYear, currentYear);
      onYearCreated(nextYear);
    } catch (err) {
      console.error('Error creating new fiscal year:', err);
      setError('Failed to create new fiscal year. Please try again.');
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Start New Fiscal Year</h2>

        <div className="modal-body">
          <p>
            The current fiscal year ({formatFiscalYearDisplay(currentYear)}) has ended on September 30th.
          </p>
          <p>
            You need to create a new fiscal year ({nextYearDisplay}) to continue entering data.
          </p>
          <p style={{ backgroundColor: '#e6fffa', padding: '0.75rem', borderRadius: '4px', fontSize: '0.9rem' }}>
            <strong>Note:</strong> Your fixed costs will be automatically copied from {formatFiscalYearDisplay(currentYear)} to the new year.
          </p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            onClick={handleCreateNewYear}
            disabled={isCreating}
            className="btn btn-primary"
          >
            {isCreating ? 'Creating...' : `Create ${nextYearDisplay}`}
          </button>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .modal-content h2 {
          margin-top: 0;
          color: #333;
        }

        .modal-body {
          margin: 1.5rem 0;
        }

        .modal-body p {
          margin: 1rem 0;
          line-height: 1.6;
          color: #666;
        }

        .error-message {
          padding: 0.75rem;
          background-color: #fee;
          border: 1px solid #fcc;
          border-radius: 4px;
          color: #c33;
          margin-top: 1rem;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #545b62;
        }
      `}</style>
    </div>
  );
};

export default NewYearModal;
