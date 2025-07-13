import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface KPI {
  id: string;
  name: string;
  description: string;
  weight: number;
  category: string;
}

interface Clinician {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  assignedDirector: string;
  startDate: string;
}

interface ReviewData {
  [kpiId: string]: {
    met: boolean | null;
    reviewDate?: string;
    notes?: string;
    plan?: string;
    files?: File[];
  };
}

export const generateReviewPDF = (
  clinician: Clinician,
  kpis: KPI[],
  reviewData: ReviewData,
  month: string,
  year: number,
  score: number
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(59, 130, 246); // Blue color
  doc.text('Monthly KPI Review Report', margin, 30);

  // Clinician Information
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Clinician Information', margin, 50);
  
  doc.setFontSize(11);
  const clinicianInfo = [
    `Name: ${clinician.name}`,
    `Position: ${clinician.position}`,
    `Department: ${clinician.department}`,
    `Email: ${clinician.email}`,
    `Review Period: ${month} ${year}`,
    `Overall Score: ${score}%`
  ];

  clinicianInfo.forEach((info, index) => {
    doc.text(info, margin, 65 + (index * 8));
  });

  // Score Summary Box
  doc.setFillColor(59, 130, 246, 0.1);
  doc.rect(margin, 120, pageWidth - (margin * 2), 25, 'F');
  doc.setFontSize(12);
  doc.setTextColor(59, 130, 246);
  doc.text(`Performance Score: ${score}%`, margin + 10, 135);
  
  const scoreLabel = score >= 90 ? 'Excellent' : score >= 80 ? 'Good' : score >= 70 ? 'Average' : 'Needs Improvement';
  doc.text(`Rating: ${scoreLabel}`, margin + 10, 142);

  // KPI Details Table
  let yPosition = 160;
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('KPI Review Details', margin, yPosition);

  // Prepare table data
  const tableData = kpis.map(kpi => {
    const kpiData = reviewData[kpi.id] || {};
    const status = kpiData.met === true ? 'Met' : kpiData.met === false ? 'Not Met' : 'Not Reviewed';
    const weight = kpi.weight.toString();
    const category = kpi.category;
    
    return [kpi.name, category, weight, status];
  });

  // Add table
  (doc as any).autoTable({
    startY: yPosition + 10,
    head: [['KPI Name', 'Category', 'Weight', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 40 },
      2: { cellWidth: 20 },
      3: { cellWidth: 30 }
    }
  });

  // Add detailed notes for unmet KPIs
  const unmetKPIs = kpis.filter(kpi => reviewData[kpi.id]?.met === false);
  
  if (unmetKPIs.length > 0) {
    let currentY = (doc as any).lastAutoTable.finalY + 20;
    
    doc.setFontSize(14);
    doc.text('Improvement Plans & Notes', margin, currentY);
    currentY += 15;

    unmetKPIs.forEach((kpi, index) => {
      const kpiData = reviewData[kpi.id];
      
      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 30;
      }

      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38); // Red color for unmet KPIs
      doc.text(`${index + 1}. ${kpi.name}`, margin, currentY);
      currentY += 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      if (kpiData?.reviewDate) {
        doc.text(`Review Date: ${new Date(kpiData.reviewDate).toLocaleDateString()}`, margin + 10, currentY);
        currentY += 8;
      }

      if (kpiData?.notes) {
        doc.text('Notes:', margin + 10, currentY);
        currentY += 6;
        const notesLines = doc.splitTextToSize(kpiData.notes, pageWidth - margin * 3);
        doc.text(notesLines, margin + 15, currentY);
        currentY += notesLines.length * 5 + 5;
      }

      if (kpiData?.plan) {
        doc.text('Improvement Plan:', margin + 10, currentY);
        currentY += 6;
        const planLines = doc.splitTextToSize(kpiData.plan, pageWidth - margin * 3);
        doc.text(planLines, margin + 15, currentY);
        currentY += planLines.length * 5 + 10;
      }

      if (kpiData?.files && kpiData.files.length > 0) {
        doc.text(`Supporting Files: ${kpiData.files.length} file(s) attached`, margin + 10, currentY);
        currentY += 10;
      }
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
      margin,
      doc.internal.pageSize.height - 10
    );
    doc.text(
      'Clinical KPI Tracking System',
      pageWidth - margin - 50,
      doc.internal.pageSize.height - 10
    );
  }

  // Generate filename
  const filename = `${clinician.name.replace(/\s+/g, '_')}_KPI_Review_${month}_${year}.pdf`;
  
  // Download the PDF
  doc.save(filename);
};

export const generateClinicianSummaryPDF = (
  clinician: Clinician,
  kpis: KPI[],
  monthlyScores: Array<{ month: string; year: number; score: number }>,
  recentReviews: any[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(59, 130, 246);
  doc.text('Clinician Performance Summary', margin, 30);

  // Clinician Information
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Clinician Profile', margin, 50);
  
  doc.setFontSize(11);
  const clinicianInfo = [
    `Name: ${clinician.name}`,
    `Position: ${clinician.position}`,
    `Department: ${clinician.department}`,
    `Email: ${clinician.email}`,
    `Start Date: ${new Date(clinician.startDate).toLocaleDateString()}`,
    `Report Generated: ${new Date().toLocaleDateString()}`
  ];

  clinicianInfo.forEach((info, index) => {
    doc.text(info, margin, 65 + (index * 8));
  });

  // Performance Trend
  let yPosition = 130;
  doc.setFontSize(14);
  doc.text('12-Month Performance Trend', margin, yPosition);

  const trendData = monthlyScores.slice(-12).map(score => [
    `${score.month} ${score.year}`,
    `${score.score}%`
  ]);

  (doc as any).autoTable({
    startY: yPosition + 10,
    head: [['Month', 'Score']],
    body: trendData,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 30 }
    }
  });

  // Average Score Calculation
  const avgScore = monthlyScores.length > 0 
    ? Math.round(monthlyScores.reduce((sum, score) => sum + score.score, 0) / monthlyScores.length)
    : 0;

  const currentY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFillColor(34, 197, 94, 0.1);
  doc.rect(margin, currentY, pageWidth - (margin * 2), 20, 'F');
  doc.setFontSize(12);
  doc.setTextColor(34, 197, 94);
  doc.text(`Average Performance Score: ${avgScore}%`, margin + 10, currentY + 12);

  // Generate filename
  const filename = `${clinician.name.replace(/\s+/g, '_')}_Performance_Summary.pdf`;
  
  // Download the PDF
  doc.save(filename);
};

export const generateMonthlyDataPDF = (
  clinician: any,
  kpis: any[],
  reviewsOrTeamData: any,
  month: string,
  year: number,
  score: number
) => {
  console.log('generateMonthlyDataPDF called with:', { clinician, kpis, reviewsOrTeamData, month, year, score });
  
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    
    if (clinician) {
      // Individual clinician report
      doc.text('Monthly Performance Report', margin, 30);
      
      // Clinician Information
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Clinician Information', margin, 50);
      
      doc.setFontSize(11);
      const clinicianInfo = [
        `Name: ${clinician.name || 'Unknown'}`,
        `Position: ${clinician.position_info?.position_title || 'Clinician'}`,
        `Department: ${clinician.clinician_info?.type_info?.title || 'General'}`,
        `Report Period: ${month} ${year}`,
        `Performance Score: ${score}%`
      ];

      let infoYPosition = 65;
      clinicianInfo.forEach((info) => {
        const lines = doc.splitTextToSize(info, pageWidth - margin * 2);
        doc.text(lines, margin, infoYPosition);
        infoYPosition += lines.length * 6 + 2;
      });

      // Score Summary Box
      doc.setFillColor(59, 130, 246, 0.1);
      doc.rect(margin, 115, pageWidth - (margin * 2), 25, 'F');
      doc.setFontSize(12);
      doc.setTextColor(59, 130, 246);
      doc.text(`Performance Score: ${score}%`, margin + 10, 130);
      
      const scoreLabel = score >= 90 ? 'Excellent' : score >= 80 ? 'Good' : score >= 70 ? 'Average' : 'Needs Improvement';
      doc.text(`Rating: ${scoreLabel}`, margin + 10, 137);

      // Reviews section
      let yPosition = 155;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`KPI Reviews for ${month} ${year}`, margin, yPosition);

      if (reviewsOrTeamData && reviewsOrTeamData.length > 0) {
        yPosition += 20;
        
        reviewsOrTeamData.forEach((review: any, index: number) => {
          // Check if we need a new page (with more buffer space)
          if (yPosition > doc.internal.pageSize.height - 100) {
            doc.addPage();
            yPosition = 30;
            
            // Add header on new page
            doc.setFontSize(14);
            doc.setTextColor(59, 130, 246);
            doc.text(`KPI Reviews for ${month} ${year} (continued)`, margin, yPosition);
            yPosition += 20;
          }
          
          const kpi = kpis.find(k => k.id === review.kpiId);
          
          // Add a light separator line between reviews (except for first one)
          if (index > 0) {
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);
          }
          
          // KPI Title (bold style)
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.text(`${index + 1}. ${kpi?.title || 'Unknown KPI'}`, margin, yPosition);
          yPosition += 12;
          
          // Status with color coding
          doc.setFontSize(10);
          if (review.met) {
            doc.setTextColor(0, 128, 0); // Green for met
            doc.text(`✓ Status: Met`, margin + 10, yPosition);
          } else {
            doc.setTextColor(200, 0, 0); // Red for not met
            doc.text(`✗ Status: Not Met`, margin + 10, yPosition);
          }
          doc.setTextColor(0, 0, 0); // Reset to black
          yPosition += 12;
          
          // Notes with text wrapping
          if (review.notes && review.notes.trim()) {
            doc.setFontSize(9);
            doc.setTextColor(60, 60, 60);
            const notesLines = doc.splitTextToSize(`Notes: ${review.notes}`, pageWidth - margin * 2 - 10);
            doc.text(notesLines, margin + 10, yPosition);
            yPosition += notesLines.length * 4 + 8;
          }
          
          // Plan with text wrapping
          if (review.plan && review.plan.trim()) {
            doc.setFontSize(9);
            doc.setTextColor(60, 60, 60);
            const planLines = doc.splitTextToSize(`Improvement Plan: ${review.plan}`, pageWidth - margin * 2 - 10);
            doc.text(planLines, margin + 10, yPosition);
            yPosition += planLines.length * 4 + 8;
          }
          
          yPosition += 15; // Extra spacing between reviews
        });
      } else {
        doc.setFontSize(11);
        doc.setTextColor(128, 128, 128);
        doc.text(`No reviews found for ${month} ${year}`, margin, yPosition + 20);
      }

      // Generate filename
      const filename = `${clinician.name.replace(/\s+/g, '_')}_${month}_${year}_Report.pdf`;
      doc.save(filename);
      
    } else {
      // Team summary report
      doc.text('Team Performance Summary', margin, 30);
      
      // Summary Information
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Team Summary', margin, 50);
      
      doc.setFontSize(11);
      const summaryInfo = [
        `Report Period: ${month} ${year}`,
        `Team Average Score: ${score}%`,
        `Total Team Members: ${reviewsOrTeamData.length}`,
        `Generated: ${new Date().toLocaleDateString()}`
      ];

      let summaryYPosition = 65;
      summaryInfo.forEach((info) => {
        const lines = doc.splitTextToSize(info, pageWidth - margin * 2);
        doc.text(lines, margin, summaryYPosition);
        summaryYPosition += lines.length * 6 + 2;
      });

      // Team Performance List
      let yPosition = 110;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`Team Performance for ${month} ${year}`, margin, yPosition);

      if (reviewsOrTeamData && reviewsOrTeamData.length > 0) {
        yPosition += 20;
        
        reviewsOrTeamData.forEach((member: any, index: number) => {
          // Check if we need a new page
          if (yPosition > doc.internal.pageSize.height - 80) {
            doc.addPage();
            yPosition = 30;
          }
          
          const reviewCount = member.reviews ? member.reviews.length : 0;
          const metCount = member.reviews ? member.reviews.filter((r: any) => r.met).length : 0;
          const rating = member.score >= 90 ? 'Excellent' : member.score >= 80 ? 'Good' : member.score >= 70 ? 'Average' : 'Needs Improvement';
          
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          
          // Member name
          doc.text(`${index + 1}. ${member.clinician.name}`, margin, yPosition);
          yPosition += 10;
          
          // Position with text wrapping
          const positionText = `Position: ${member.clinician.position_info?.position_title || 'Clinician'}`;
          const positionLines = doc.splitTextToSize(positionText, pageWidth - margin * 2 - 10);
          doc.text(positionLines, margin + 10, yPosition);
          yPosition += positionLines.length * 5 + 5;
          
          // Score and metrics
          const metricsText = `Score: ${member.score}% | KPIs Met: ${metCount}/${reviewCount} | Rating: ${rating}`;
          const metricsLines = doc.splitTextToSize(metricsText, pageWidth - margin * 2 - 10);
          doc.text(metricsLines, margin + 10, yPosition);
          yPosition += metricsLines.length * 5 + 15; // Extra spacing between members
        });
      } else {
        doc.setFontSize(11);
        doc.setTextColor(128, 128, 128);
        doc.text(`No team data found for ${month} ${year}`, margin, yPosition + 20);
      }

      // Generate filename
      const filename = `Team_Performance_${month}_${year}.pdf`;
      doc.save(filename);
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
        margin,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        'Clinical KPI Tracking System',
        pageWidth - margin - 50,
        doc.internal.pageSize.height - 10
      );
    }
    
    console.log('PDF generation completed successfully');
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Error generating PDF. Please check the console for details.');
  }
};