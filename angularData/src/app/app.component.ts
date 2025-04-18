import { Component, AfterViewInit } from '@angular/core';
import * as d3 from 'd3';
import geneDataJson from '../../public/example_data.json';
import { FormsModule } from '@angular/forms';
import { HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterViewInit {
  errorMessage: string = '';
  showError: boolean = false;
  private fadeTimeout: any = null;

  showErrorWithFade(msg: string) {
    // Clear previous fade timeout
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
  
    this.errorMessage = msg;
    this.showError = true;
  
    this.fadeTimeout = setTimeout(() => {
      this.showError = false;
      this.fadeTimeout = null;
    }, 2000);
  }

  fadeOutError() {
    const el = document.querySelector('.error-overlay') as HTMLElement;
    if (el) {
      el.classList.add('fade-out');
      setTimeout(() => {
        this.showError = false;
        this.errorMessage = '';
        el.classList.remove('fade-out'); // reset for next use
      }, 300);
    } else {
      this.showError = false;
      this.errorMessage = '';
    }
  }

  ngAfterViewInit(): void {
    this.drawChart();
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('input') && !target.closest('button') && this.showError) {
      this.fadeOutError(); 
    }
  }


  geneData: { label: string; value: number }[] = [...geneDataJson.gene];
  newGene: { label: string; value: number | null } = { label: '', value: null };


  addGene() {
    if (this.newGene.label && this.newGene.value != null && this.newGene.value > 0) {
      const existing = this.geneData.find(
        (g) => g.label.toLowerCase() === this.newGene.label.toLowerCase()
      );
  
      if (existing) {
        existing.value += this.newGene.value;
      } else {
        this.geneData.push({
          label: this.newGene.label.toUpperCase(),
          value: this.newGene.value,
        });
      }
  
      this.newGene = { label: '', value: null };
  
      this.updateChart();
    }
  }

  removeGene() {
    if (this.newGene.label && this.newGene.value != null && this.newGene.value > 0) {
      const existing = this.geneData.find(
        (g) => g.label.toLowerCase() === this.newGene.label.toLowerCase()
      );
  
      if (existing) {
        existing.value -= this.newGene.value;
        if(existing.value <= 0) {
          const index = this.geneData.findIndex(
            (g) => g.label.toUpperCase() === this.newGene.label.toUpperCase()
          );
          if (index !== -1) {
            this.geneData.splice(index, 1);
          }
        }
      } else {
        this.showErrorWithFade(`Gene "${this.newGene.label}" does not exist.`);
        this.newGene = { label: '', value: null };
        return; 
      }
  
      this.newGene = { label: '', value: null };
      this.errorMessage = '';
      this.updateChart();
    }
  }
  
  drawChart() {
    const width = 600;
    const barHeight = 25;
    const margin = { top: 20, right: 100, bottom: 30, left: 100 };
  
    const height = this.geneData.length * barHeight + margin.top + margin.bottom;
  
    const svg = d3
      .select('#gene-bar-chart')
      .append('svg')
      .attr('width', '100%') // responsive width
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height}`) // fixed internal size
      .attr('preserveAspectRatio', 'xMidYMid meet') // scale without distortion                          // ✅ dynamic height
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
  
    this.updateChart();
  }
  

  updateChart() {
    const sortedData = [...this.geneData].sort((a, b) => b.value - a.value);
    const fixedWidth = 800;
    const barHeight = 25;
    const margin = { top: 20, right: 100, bottom: 30, left: 100 };
    const height = this.geneData.length * barHeight + margin.top + margin.bottom;
    const container = document.getElementById('gene-bar-chart');
    const screenWidth = window.innerWidth;
    const containerWidth = container?.clientWidth || 600;
    
    // 🎯 Use full width if screen is small; otherwise use 600px
    const useResponsiveWidth = screenWidth < 768;
    const width = useResponsiveWidth 
      ? containerWidth - margin.left - margin.right
      : 600;
  
    const svg = d3.select('#gene-bar-chart svg')
      .attr('height', height)
      .attr('width', '100%')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .select('g');
  
    const x = d3.scaleLinear()
      .domain([0, d3.max(sortedData, d => d.value)!])
      .range([0, width]);
  
    const y = d3
      .scaleBand()
      .domain(sortedData.map((d) => d.label))
      .range([0, barHeight * sortedData.length])
      .padding(0.1);
    
    // DATA JOIN for bars
    const bars = svg.selectAll('rect')
    .data(sortedData, (d: any) => (d as { label: string }).label);
  
    // ENTER new bars
    bars.enter()
      .append('rect')
      .attr('y', (d) => y(d.label)!)
      .attr('width', 0)
      .attr('height', y.bandwidth())
      .attr('fill', '#69b3a2')
      .transition()
      .duration(500)
      .attr('width', (d) => x(d.value));
  
    // UPDATE existing bars
    bars.transition()
      .duration(500)
      .attr('y', (d) => y(d.label)!)
      .attr('width', (d) => x(d.value))
      .attr('height', y.bandwidth());
  
    // EXIT removed bars
    bars.exit()
      .transition()
      .duration(400)
      .attr('width', 0)
      .remove();
  
    // LABELS JOIN
    const labels = svg.selectAll<SVGTextElement, { label: string; value: number }>('text.label')
    .data(sortedData, d => d.label);
  
    labels.enter()
    .append('text')
    .attr('class', 'label')
    .attr('x', 0)
    .attr('y', (d) => (y(d.label) ?? 0) + y.bandwidth() / 2 + 5)
    .text((d) => d.value.toString())
    .style('font-size', '16px') // number font size
    .style('font-family', 'Arial, sans-serif')
    .style('fill', '#444')
    .merge(labels)
    .transition()
    .duration(500)
    .attr('x', (d) => x(d.value) + 5)
    .attr('y', (d) => (y(d.label) ?? 0) + y.bandwidth() / 2 + 5)
    .text((d) => d.value.toString());
  
  labels
    .transition()
    .duration(500)
    .attr('x', (d) => x(d.value) + 5)
    .attr('y', (d) => (y(d.label) ?? 0) + y.bandwidth() / 2 + 5)
    .text((d) => d.value.toString());

  labels.exit()
    .transition()
    .duration(400)
    .attr('x', 0)
    .remove();
  
    // Redraw Y-axis
    svg.selectAll('.y-axis').remove();
    const yAxis = svg.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(y));
  
  // Truncate labels and add tooltips
    yAxis.selectAll('text')
      .text(function(d) {
        const label = String(d); // force convert just in case
        return label.length > 8 ? label.slice(0, 6) + '...' : label;
      })
      .style('font-size', '16px') // ✅ font size restored
      .style('font-family', 'Arial, sans-serif')
      .style('fill', '#333')
      .append('title')
      .text(function (d) {
        return String(d);
      });
    /*svg.append('g') //gene font size
    .attr('class', 'y-axis')
    .call(d3.axisLeft(y))
    .selectAll('text')
    .style('font-size', '16px')
    .style('font-family', 'Arial, sans-serif')
    .style('fill', '#black');*/
  }
}
