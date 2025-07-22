import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface KPI {
  id: string;
  title: string;
  description: string;
  weight: number;
  floor: string;
  is_removed: boolean;
  created_at?: string;
  updated_at?: string;
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
    `Direction: ${clinician.department}`, // This field contains direction/specialty info
    `Username: ${clinician.email}`, // Using email field to store username
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
    const weight = `${kpi.weight}%`;
    const floor = kpi.floor || 'General'; // Use floor as category
    
    return [kpi.title, floor, weight, status]; // Use title instead of name
  });

  // Add table
  autoTable(doc, {
    startY: yPosition + 10,
    head: [['KPI Title', 'Floor', 'Weight', 'Status']],
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
    // Always start Improvement Plans & Notes on a new page
    doc.addPage();
    let currentY = 30;
    
    // Add a header section for the second page
    doc.setFontSize(16);
    doc.setTextColor(220, 38, 38); // Red color to indicate areas needing improvement
    doc.text('Improvement Plans & Notes', margin, currentY);
    currentY += 10;
    
    // Add a subtitle
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('Detailed feedback and action plans for KPIs that were not met', margin, currentY);
    currentY += 15;
    
    // Add a separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 15;

    unmetKPIs.forEach((kpi, index) => {
      const kpiData = reviewData[kpi.id];
      
      // Estimate content height for this KPI
      let estimatedHeight = 20; // Base height for title and spacing
      
      if (kpiData?.reviewDate) estimatedHeight += 8;
      if (kpiData?.notes) {
        const notesLines = doc.splitTextToSize(kpiData.notes, pageWidth - margin * 3);
        estimatedHeight += notesLines.length * 5 + 11; // 6 for label + 5 for spacing
      }
      if (kpiData?.plan) {
        const planLines = doc.splitTextToSize(kpiData.plan, pageWidth - margin * 3);
        estimatedHeight += planLines.length * 5 + 16; // 6 for label + 10 for spacing
      }
      if (kpiData?.files && kpiData.files.length > 0) estimatedHeight += 10;
      
      // Check if we need a new page for this entire KPI section
      if (currentY + estimatedHeight > 270) {
        doc.addPage();
        currentY = 30;
      }

      // Add a light background box for each KPI section
      doc.setFillColor(250, 250, 250);
      doc.rect(margin - 5, currentY - 5, pageWidth - (margin * 2) + 10, estimatedHeight, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38); // Red color for unmet KPIs
      doc.text(`${index + 1}. ${kpi.title}`, margin, currentY);
      currentY += 12;

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
      
      // Add extra spacing between KPIs
      currentY += 5;
    });
  } else {
    // If no unmet KPIs, add a congratulatory message on the first page
    let currentY = (doc as any).lastAutoTable?.finalY + 30 || yPosition + 120;
    
    // Check if we have enough space on the first page
    if (currentY > 240) {
      doc.addPage();
      currentY = 30;
    }
    
    doc.setFillColor(34, 197, 94, 0.1); // Light green background
    doc.rect(margin, currentY - 10, pageWidth - (margin * 2), 40, 'F');
    
    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94); // Green color
    doc.text('🎉 Excellent Performance!', margin + 10, currentY + 5);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('All KPIs have been met for this review period.', margin + 10, currentY + 18);
    doc.text('Keep up the great work!', margin + 10, currentY + 28);
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
    `Direction: ${clinician.department}`, // This field contains direction/specialty info
    `Username: ${clinician.email}`, // Using email field to store username
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

  autoTable(doc, {
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

  const currentY = (doc as any).lastAutoTable?.finalY + 20 || yPosition + 100;
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

export const generatePerformancePDF = (
  userRole: string,
  userName: string,
  kpis: any[],
  reviewItems: any[],
  userClinicians: any[],
  month: string,
  year: number
) => {
  console.log('generatePerformancePDF called with:', { userRole, userName, kpis, reviewItems, userClinicians, month, year });
  
  // Filter reviews based on user role - similar to filterReviewsByUserRole in Dashboard
  const filterReviewsByRole = (reviews: any[]) => {
    return reviews.filter(review => {
      // Find the clinician for this review
      const clinician = userClinicians.find(c => c.id === review.clinician);
      if (!clinician) return false;

      if (userRole === 'super-admin') {
        // Super-admin can see all reviews from approved clinicians
        return true;
      } else if (userRole === 'director') {
        // Directors can only see reviews for their assigned approved clinicians
        const assignedClinicianIds = userClinicians.map(c => c.id);
        return assignedClinicianIds.includes(review.clinician);
      }
      return false;
    });
  };

  // Filter the reviews by user role
  const filteredReviews = filterReviewsByRole(reviewItems);
  
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text(`${month} ${year} Performance Report`, margin, 30);
    
    // User Information
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Report Information', margin, 50);
    
    doc.setFontSize(11);
    const reportInfo = [
      `Generated by: ${userName}`,
      `Role: ${userRole === 'super-admin' ? 'Super Administrator' : 'Director'}`,
      `Report Period: ${month} ${year}`,
      `Team Members: ${userClinicians.length}`,
      `Generated on: ${new Date().toLocaleDateString()}`
    ];

    let infoYPosition = 65;
    reportInfo.forEach((info) => {
      const lines = doc.splitTextToSize(info, pageWidth - margin * 2);
      doc.text(lines, margin, infoYPosition);
      infoYPosition += lines.length * 6 + 2;
    });

    // Performance Summary
    let yPosition = 120;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Performance Summary', margin, yPosition);
    yPosition += 15;

    // Calculate summary statistics
    const kpisWithReviews = kpis.filter(kpi => {
      const kpiReviews = filteredReviews.filter(review => {
        const reviewDate = new Date(review.date);
        const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
        const reviewYear = reviewDate.getFullYear();
        return review.kpi === kpi.id && 
               reviewMonth === month && 
               reviewYear === year;
      });
      return kpiReviews.length > 0;
    });

    const avgMetRate = kpisWithReviews.length > 0 ? Math.round(
      kpisWithReviews.reduce((acc, kpi) => {
        const kpiReviews = filteredReviews.filter(review => {
          const reviewDate = new Date(review.date);
          const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
          const reviewYear = reviewDate.getFullYear();
          return review.kpi === kpi.id && 
                 reviewMonth === month && 
                 reviewYear === year;
        });
        const metCount = kpiReviews.filter(r => r.met_check).length;
        return acc + (metCount / kpiReviews.length) * 100;
      }, 0) / kpisWithReviews.length
    ) : 0;

    const kpisNeedingAttention = kpis.filter(kpi => {
      const kpiReviews = filteredReviews.filter(review => {
        const reviewDate = new Date(review.date);
        const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
        const reviewYear = reviewDate.getFullYear();
        return review.kpi === kpi.id && 
               reviewMonth === month && 
               reviewYear === year;
      });
      if (kpiReviews.length === 0) return false;
      const metCount = kpiReviews.filter(r => r.met_check).length;
      const metRate = (metCount / kpiReviews.length) * 100;
      return metRate < 70;
    }).length;

    // Summary boxes
    doc.setFillColor(59, 130, 246, 0.1);
    doc.rect(margin, yPosition, (pageWidth - margin * 3) / 3, 30, 'F');
    doc.setFontSize(10);
    doc.setTextColor(59, 130, 246);
    doc.text('Total KPIs', margin + 5, yPosition + 10);
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(kpis.length.toString(), margin + 5, yPosition + 20);

    doc.setFillColor(34, 197, 94, 0.1);
    doc.rect(margin + (pageWidth - margin * 3) / 3 + 5, yPosition, (pageWidth - margin * 3) / 3, 30, 'F');
    doc.setFontSize(10);
    doc.setTextColor(34, 197, 94);
    doc.text('Avg Met Rate', margin + (pageWidth - margin * 3) / 3 + 10, yPosition + 10);
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`${avgMetRate}%`, margin + (pageWidth - margin * 3) / 3 + 10, yPosition + 20);

    doc.setFillColor(245, 158, 11, 0.1);
    doc.rect(margin + 2 * ((pageWidth - margin * 3) / 3) + 10, yPosition, (pageWidth - margin * 3) / 3, 30, 'F');
    doc.setFontSize(10);
    doc.setTextColor(245, 158, 11);
    doc.text('Needs Attention', margin + 2 * ((pageWidth - margin * 3) / 3) + 15, yPosition + 10);
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(kpisNeedingAttention.toString(), margin + 2 * ((pageWidth - margin * 3) / 3) + 15, yPosition + 20);

    yPosition += 50;

    // Staff Needing Attention Summary
    const allStaffNeedingAttention = new Map();
    
    kpis.forEach(kpi => {
      const kpiReviews = filteredReviews.filter(review => {
        const reviewDate = new Date(review.date);
        const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
        const reviewYear = reviewDate.getFullYear();
        return review.kpi === kpi.id && 
               reviewMonth === month && 
               reviewYear === year;
      });
      
      kpiReviews.filter(r => !r.met_check).forEach(review => {
        const clinician = userClinicians.find(c => c.id === review.clinician);
        if (clinician) {
          const key = clinician.id;
          if (!allStaffNeedingAttention.has(key)) {
            allStaffNeedingAttention.set(key, {
              name: clinician.name,
              kpis: [],
              totalUnmet: 0
            });
          }
          allStaffNeedingAttention.get(key).kpis.push({
            title: kpi.title,
            hasNotes: !!review.notes,
            hasPlan: !!review.plan,
            hasFile: !!review.file_url
          });
          allStaffNeedingAttention.get(key).totalUnmet++;
        }
      });
    });

    if (allStaffNeedingAttention.size > 0) {
      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38);
      doc.text('Staff Requiring Attention Summary', margin, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`${allStaffNeedingAttention.size} staff members need attention across multiple KPIs`, margin, yPosition);
      yPosition += 15;

      const staffArray = Array.from(allStaffNeedingAttention.values())
        .sort((a, b) => b.totalUnmet - a.totalUnmet);

      staffArray.slice(0, 10).forEach((staff, index) => {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 30;
        }

        doc.setFontSize(10);
        doc.setTextColor(220, 38, 38);
        const staffNameText = `${index + 1}. ${staff.name} (${staff.totalUnmet} unmet KPIs)`;
        const wrappedStaffName = doc.splitTextToSize(staffNameText, pageWidth - margin * 2 - 10);
        doc.text(wrappedStaffName, margin, yPosition);
        yPosition += wrappedStaffName.length * 6 + 2;

        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        const kpiTitles = staff.kpis.slice(0, 3).map(kpi => kpi.title).join(', ');
        const kpiText = `   KPIs: ${kpiTitles}${staff.kpis.length > 3 ? ` +${staff.kpis.length - 3} more` : ''}`;
        const wrappedKpiText = doc.splitTextToSize(kpiText, pageWidth - margin * 2 - 10);
        doc.text(wrappedKpiText, margin, yPosition);
        yPosition += wrappedKpiText.length * 5 + 7;
      });

      if (staffArray.length > 10) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`... and ${staffArray.length - 10} more staff members`, margin, yPosition);
        yPosition += 10;
      }

      yPosition += 10;
    }

    // KPI Performance Breakdown
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('KPI Performance Breakdown', margin, yPosition);
    yPosition += 15;

    // Prepare table data
    const tableData = kpis.map(kpi => {
      const kpiReviews = filteredReviews.filter(review => {
        const reviewDate = new Date(review.date);
        const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
        const reviewYear = reviewDate.getFullYear();
        return review.kpi === kpi.id && 
               reviewMonth === month && 
               reviewYear === year;
      });
      
      if (kpiReviews.length === 0) {
        return [kpi.title, '0', '0', '0%', 'No Reviews'];
      }
      
      const totalReviews = kpiReviews.length;
      const metCount = kpiReviews.filter(r => r.met_check).length;
      const notMetCount = totalReviews - metCount;
      const metPercentage = Math.round((metCount / totalReviews) * 100);
      const status = metPercentage >= 90 ? 'Excellent' : 
                    metPercentage >= 70 ? 'Good' : 
                    metPercentage >= 50 ? 'Average' : 'Needs Attention';
      
      return [kpi.title, metCount.toString(), notMetCount.toString(), `${metPercentage}%`, status];
    });

    // Add table with proper text wrapping
    autoTable(doc, {
      startY: yPosition,
      head: [['KPI Title', 'Met', 'Not Met', 'Success Rate', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 4,
        overflow: 'linebreak'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { 
          cellWidth: 70, 
          halign: 'left',
          overflow: 'linebreak'
        },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { 
          cellWidth: 30, 
          halign: 'center',
          overflow: 'linebreak'
        }
      },
      didParseCell: function(data) {
        // Color code the status column
        if (data.column.index === 4 && data.section === 'body') {
          const status = data.cell.text[0];
          if (status === 'Excellent') {
            data.cell.styles.textColor = [21, 128, 61];
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Good') {
            data.cell.styles.textColor = [59, 130, 246];
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Average') {
            data.cell.styles.textColor = [245, 158, 11];
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Needs Attention') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // Color code the success rate column
        if (data.column.index === 3 && data.section === 'body') {
          const rate = parseInt(data.cell.text[0]);
          if (rate >= 90) {
            data.cell.styles.textColor = [21, 128, 61];
            data.cell.styles.fontStyle = 'bold';
          } else if (rate >= 70) {
            data.cell.styles.textColor = [59, 130, 246];
            data.cell.styles.fontStyle = 'bold';
          } else if (rate >= 50) {
            data.cell.styles.textColor = [245, 158, 11];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // Add detailed breakdown for KPIs needing attention
    const kpisNeedingAttentionDetails = kpis.filter(kpi => {
      const kpiReviews = filteredReviews.filter(review => {
        const reviewDate = new Date(review.date);
        const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
        const reviewYear = reviewDate.getFullYear();
        return review.kpi === kpi.id && 
               reviewMonth === month && 
               reviewYear === year;
      });
      if (kpiReviews.length === 0) return false;
      const metCount = kpiReviews.filter(r => r.met_check).length;
      const metRate = (metCount / kpiReviews.length) * 100;
      return metRate < 70;
    });

    if (kpisNeedingAttentionDetails.length > 0) {
      doc.addPage();
      let currentY = 30;
      
      doc.setFontSize(16);
      doc.setTextColor(220, 38, 38);
      doc.text('KPIs Requiring Attention', margin, currentY);
      currentY += 10;
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text('Detailed breakdown of KPIs with performance below 70%', margin, currentY);
      currentY += 20;

      kpisNeedingAttentionDetails.forEach((kpi, index) => {
        const kpiReviews = filteredReviews.filter(review => {
          const reviewDate = new Date(review.date);
          const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
          const reviewYear = reviewDate.getFullYear();
          return review.kpi === kpi.id && 
                 reviewMonth === month && 
                 reviewYear === year;
        });

        const cliniciansNotMet = kpiReviews
          .filter(r => !r.met_check)
          .map(r => {
            const clinician = userClinicians.find(c => c.id === r.clinician);
            return clinician ? { 
              name: clinician.name, 
              review: r,
              clinician: clinician 
            } : null;
          })
          .filter(Boolean);

        // Check if we need a new page
        if (currentY > 250) {
          doc.addPage();
          currentY = 30;
        }

        doc.setFillColor(250, 250, 250);
        doc.rect(margin - 5, currentY - 5, pageWidth - (margin * 2) + 10, 40, 'F');
        
        doc.setFontSize(12);
        doc.setTextColor(220, 38, 38);
        
        // Wrap KPI title if it's too long
        const kpiTitleText = `${index + 1}. ${kpi.title}`;
        const wrappedTitle = doc.splitTextToSize(kpiTitleText, pageWidth - (margin * 2) - 10);
        doc.text(wrappedTitle, margin, currentY);
        currentY += wrappedTitle.length * 6 + 6;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        const totalReviews = kpiReviews.length;
        const metCount = kpiReviews.filter(r => r.met_check).length;
        const metPercentage = Math.round((metCount / totalReviews) * 100);
        
        doc.text(`Performance: ${metCount}/${totalReviews} (${metPercentage}%)`, margin + 10, currentY);
        currentY += 8;

        if (cliniciansNotMet.length > 0) {
          doc.text(`Staff needing attention (${cliniciansNotMet.length}):`, margin + 10, currentY);
          currentY += 8;
          
          cliniciansNotMet.slice(0, 4).forEach((item, idx) => {
            // Check if we need a new page (more conservative since we show more content)
            if (currentY > 200) {
              doc.addPage();
              currentY = 30;
            }
            
            doc.setFontSize(9);
            
            // Wrap staff name if it's too long
            const staffText = `• ${item.name}`;
            const wrappedStaffName = doc.splitTextToSize(staffText, pageWidth - margin * 2 - 30);
            doc.text(wrappedStaffName, margin + 15, currentY);
            currentY += wrappedStaffName.length * 5 + 2;
            
            // Display actual notes and plans content
            if (item.review.notes) {
              doc.setTextColor(75, 85, 99);
              doc.setFont('helvetica', 'bold');
              doc.text('Notes:', margin + 20, currentY);
              currentY += 5;
              
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(107, 114, 128);
              const notesText = item.review.notes;
              const wrappedNotes = doc.splitTextToSize(notesText, pageWidth - margin * 2 - 30);
              doc.text(wrappedNotes, margin + 20, currentY);
              currentY += wrappedNotes.length * 4 + 3;
            }
            
            if (item.review.plan) {
              doc.setTextColor(75, 85, 99);
              doc.setFont('helvetica', 'bold');
              doc.text('Action Plan:', margin + 20, currentY);
              currentY += 5;
              
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(107, 114, 128);
              const planText = item.review.plan;
              const wrappedPlan = doc.splitTextToSize(planText, pageWidth - margin * 2 - 30);
              doc.text(wrappedPlan, margin + 20, currentY);
              currentY += wrappedPlan.length * 4 + 3;
            }
            
            if (item.review.file_url) {
              doc.setTextColor(75, 85, 99);
              doc.setFont('helvetica', 'bold');
              doc.text('Attachment:', margin + 20, currentY);
              
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(59, 130, 246);
              doc.text('File attached', margin + 50, currentY);
              currentY += 8;
            }
            
            // Reset text color
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            
            currentY += 6;
          });
          
          if (cliniciansNotMet.length > 4) {
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`... and ${cliniciansNotMet.length - 4} more staff members`, margin + 15, currentY);
            doc.setTextColor(0, 0, 0);
            currentY += 6;
          }
        }
        
        currentY += 15;
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
    const filename = `${month}_${year}_Performance_Report.pdf`;
    
    // Download the PDF
    doc.save(filename);
  } catch (error) {
    console.error('Error generating Performance PDF:', error);
    throw error;
  }
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
      doc.text(`KPI Review results for ${month} ${year}`, margin, yPosition);

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
            doc.text(`KPI Review results for ${month} ${year} (continued)`, margin, yPosition);
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