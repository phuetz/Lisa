/**
 * Tests for OfficePageLayout Component
 * IT-008: Tests UI et Accessibilite
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { OfficePageLayout } from '../OfficePageLayout';

describe('OfficePageLayout', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(
        <OfficePageLayout>
          <div data-testid="content">Test Content</div>
        </OfficePageLayout>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(
        <OfficePageLayout title="Custom Title">
          <div>Content</div>
        </OfficePageLayout>
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should render title as h1', () => {
      render(
        <OfficePageLayout title="Test Page">
          <div>Content</div>
        </OfficePageLayout>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Page');
    });

    it('should render with subtitle', () => {
      render(
        <OfficePageLayout title="Title" subtitle="Subtitle Description">
          <div>Content</div>
        </OfficePageLayout>
      );

      expect(screen.getByText('Subtitle Description')).toBeInTheDocument();
    });

    it('should render custom action', () => {
      render(
        <OfficePageLayout action={<button data-testid="custom-action">Action</button>}>
          <div>Content</div>
        </OfficePageLayout>
      );

      expect(screen.getByTestId('custom-action')).toBeInTheDocument();
    });

    it('should render children correctly', () => {
      render(
        <OfficePageLayout>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </OfficePageLayout>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });

    it('should render headerContent', () => {
      render(
        <OfficePageLayout headerContent={<span data-testid="header-content">Header Extra</span>}>
          <div>Content</div>
        </OfficePageLayout>
      );

      expect(screen.getByTestId('header-content')).toBeInTheDocument();
    });
  });

  describe('Header Visibility', () => {
    it('should show header when title is provided', () => {
      render(
        <OfficePageLayout title="Visible Header">
          <div>Content</div>
        </OfficePageLayout>
      );

      expect(screen.getByText('Visible Header')).toBeInTheDocument();
    });

    it('should show header when action is provided', () => {
      render(
        <OfficePageLayout action={<button>Do something</button>}>
          <div>Content</div>
        </OfficePageLayout>
      );

      expect(screen.getByText('Do something')).toBeInTheDocument();
    });

    it('should not show header when no title, action, or headerContent', () => {
      const { container } = render(
        <OfficePageLayout>
          <div data-testid="only-content">Content</div>
        </OfficePageLayout>
      );

      // No h1 should be present
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
      // Content should still be there
      expect(screen.getByTestId('only-content')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('should use flex column layout', () => {
      const { container } = render(
        <OfficePageLayout title="Test">
          <div>Content</div>
        </OfficePageLayout>
      );

      const root = container.firstChild as HTMLElement;
      expect(root.style.display).toBe('flex');
      expect(root.style.flexDirection).toBe('column');
    });

    it('should have full height', () => {
      const { container } = render(
        <OfficePageLayout>
          <div>Content</div>
        </OfficePageLayout>
      );

      const root = container.firstChild as HTMLElement;
      expect(root.style.height).toBe('100%');
    });
  });
});
